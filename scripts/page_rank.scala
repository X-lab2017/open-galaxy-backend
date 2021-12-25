package xlab

import org.apache.spark.graphx.{Edge, EdgeContext, EdgeTriplet, Graph, Pregel, VertexId}
import org.apache.spark.rdd.RDD
import org.apache.spark.sql.{Encoder, Row, SparkSession}
import org.apache.spark.sql.types.{DoubleType, LongType, StructField, StructType}

import scala.sys.exit

object WPR {
  def initGraph(graph: Graph[None.type, Double]): Graph[(Double, Double), Double] = {
    def sendMessage(e: EdgeContext[None.type, Double, Double]) = e.sendToSrc(e.attr)

    def mergeMessage(a: Double, b: Double) = a + b

    val srcRDDs = graph.aggregateMessages(
      sendMessage,
      mergeMessage
    )
    graph.outerJoinVertices(srcRDDs)(
      (_, _, outWeightSum) => {
        (outWeightSum.getOrElse(0.0), 1.0)
      }
    )
  }

  def weightPageRank(graph: Graph[(Double, Double), Double], resetProb: Double, maxIterations: Int): RDD[Row] = {
    def vertexProgram(vid: VertexId,
                      attr: (Double, Double),
                      message: Double): (Double, Double) = (attr._1, resetProb + (1 - resetProb) * message)

    def sendMessage(e: EdgeTriplet[(Double, Double), Double]): Iterator[(VertexId, Double)] = Iterator((e.dstId, e.srcAttr._2 * e.attr / e.srcAttr._1))

    def mergeMessage(m1: Double, m2: Double): Double = m1 + m2

    Pregel(graph, 1.0, maxIterations = maxIterations)(vertexProgram, sendMessage, mergeMessage).vertices.map({
      row => Row(row._1, row._2._2)
    })
  }

  def main(args: Array[String]): Unit = {
    if (args.length == 0) exit(1)
    val arglist = args.toList
    type OptionMap = Map[Symbol, Any]

    def nextOption(map: OptionMap, list: List[String]): OptionMap = {
      list match {
        case Nil => map
        case "-it" :: value :: tail =>
          nextOption(map ++ Map('in_table -> value), tail)
        case "-ot" :: value :: tail =>
          nextOption(map ++ Map('out_table -> value), tail)
        case "-p" :: value :: tail =>
          nextOption(map ++ Map('p -> value.toDouble), tail)
        case "-iter" :: value :: tail =>
          nextOption(map ++ Map('iter -> value.toInt), tail)
        case option :: tail => println("Unknown option " + option)
          exit(1)
      }
    }

    val options = nextOption(Map(), arglist)
    val inTable = options.get('in_table).getOrElse("").toString
    if (inTable == "") exit(1)
    val outTable = options.get('out_table).getOrElse("").toString
    if (outTable == "") exit(1)
    val p = options.get('p).getOrElse(0.15).toString.toDouble
    val iter = options.get('iter).getOrElse(200).toString.toInt
    val spark = SparkSession.builder().appName("PageRank").getOrCreate()
    val sql = s"SELECT * FROM $inTable"
    val df = spark.sql(sql)
    implicit val encoder: Encoder[Edge[Double]] = org.apache.spark.sql.Encoders.kryo[Edge[Double]]
    val edges: RDD[Edge[Double]] = df
      .map(row => {
        Edge(row.get(0).toString.toLong, row.get(1).toString.toLong, row.get(2).toString.toDouble)
      })(encoder)
      .rdd
    val graph = Graph.fromEdges(edges, None)
    val prResultRDD = weightPageRank(initGraph(graph), p, iter)
    val schema = StructType(
      List(
        StructField("id", LongType, nullable = false),
        StructField("pagerank", DoubleType, nullable = true)
      ))
    val prdf = spark.createDataFrame(prResultRDD, schema)
    spark.sql(s"CREATE TABLE IF NOT EXISTS ${outTable} (id BIGINT, pagerank DOUBLE)")
    prdf.write.mode("overwrite").insertInto(outTable)
  }
}
