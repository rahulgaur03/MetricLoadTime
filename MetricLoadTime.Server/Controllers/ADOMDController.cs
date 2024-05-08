using Microsoft.AspNetCore.Mvc;
using System.Data;
using System.Diagnostics;
using Microsoft.AnalysisServices.AdomdClient;
using ClosedXML.Excel;
using System.IO.Compression;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Text.RegularExpressions;
using System.Collections;

namespace MetricLoadTime.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ADOMDController : ControllerBase
    {
        private readonly static AdomdConnection _con = new();
        private static string? _connectionString;
        private static string _endPoint = "";
        private static string _modelName = "";
        private static float _thresholdValue = 0;
        private static int _runningFirstTime = 1;
        private static string _extractPath = "";
        private static DataTable? _reportData;
        private static DataTable? _allCombinations;
        private static DataTable? _allColumnCount;

        [HttpPost("analyze")]
        public IActionResult Analyze([FromBody] AnalyzeRequest request)
        {
            _endPoint = request.EndPoint;
        _modelName = request.ModelName;
        _thresholdValue = request.ThresholdValue;
        _runningFirstTime = request.RunningFirstTime;
            _reportData = GetReportData(filePath);
            return Ok(1);
        }

        [HttpPost("progress")]
        public IActionResult Progress(string userName, string pass)
        {
            // _connectionString = "Provider=MSOLAP.8;Integrated Security=SSPI;Persist Security Info=True;Initial Catalog=f31afe8e-99ed-49b0-a520-2a3f1723eb35;Data Source=localhost:54659;MDX Compatibility=1;Safety Options=2;MDX Missing Member Mode=Error;Update Isolation Level=2";
            _connectionString = "Provider=MSOLAP.8;Data Source=" + _endPoint + ";initial catalog=" + _modelName + ";UID=" + userName + ";PWD=" + pass + "";
            _con.ConnectionString = _connectionString;

            var tableQuery = ExecuteDataTable(
                "SELECT DISTINCT [Name], [ID] FROM $SYSTEM.TMSCHEMA_TABLES",
                ["TableName", "TableID"], _con
            );

            var columnsQuery = ExecuteDataTable(
                "SELECT DISTINCT [TableID], [ExplicitName], [InferredName], [ID] FROM $SYSTEM.TMSCHEMA_COLUMNS WHERE [Type] <> 3 AND NOT [IsDefaultImage] AND [State] = 1",
                ["TableID", "ColumnName", "InferredColumnName", "ColumnID"], _con
            );

            var measureListSQLQuery = ExecuteDataTable(
                "SELECT [MEASURE_NAME],[MEASUREGROUP_NAME],[EXPRESSION],[CUBE_NAME] FROM $SYSTEM.MDSCHEMA_MEASURES WHERE MEASURE_IS_VISIBLE AND MEASUREGROUP_NAME <> 'Reporting Filters' ORDER BY [MEASUREGROUP_NAME]",
                ["Measure", "MeasureGroup", "Expression", "CubeName"], _con
            );

            var measureReferenceQuery = ExecuteDataTable(
                "SELECT DISTINCT [Object], [Referenced_Table] FROM $SYSTEM.DISCOVER_CALC_DEPENDENCY WHERE [Object_Type] = 'MEASURE'",
                ["Measure", "Referenced_Table"], _con
            );

            var relationshipQuery = ExecuteDataTable(
                "SELECT DISTINCT [FromTableID], [FromColumnID], [ToTableID], [ToColumnID] FROM $SYSTEM.TMSCHEMA_RELATIONSHIPS WHERE [IsActive]",
                ["FromTableID", "FromColumnID", "ToTableID", "ToColumnID"], _con
            );

            foreach (DataRow row in columnsQuery.Rows) row["ColumnName"] = string.IsNullOrWhiteSpace(row["ColumnName"]?.ToString()) ? row["InferredColumnName"]?.ToString() : row["ColumnName"]?.ToString();
            columnsQuery.Columns.Remove("InferredColumnName");
            var finalColumns = GetFinalColumns(tableQuery, columnsQuery);
            _allCombinations = GetAllCombination(measureListSQLQuery, measureReferenceQuery, relationshipQuery, tableQuery, finalColumns, columnsQuery);

            Task.Run(() => ExecuteAllQuery(_allCombinations));

            var jsonResult = _allCombinations.AsEnumerable().Select(row => new
            {
                UniqueID = row["UniqueID"],
                Measure = row["Measure"],
                DimensionName = row["DimensionName"],
                ColumnName = row["ColumnName"],
                LoadTime = row["LoadTime"],
                PreviousLoadTime = row["PreviousLoadTime"],
                isMeasureUsedInVisual = row["isMeasureUsedInVisual"],
                ReportName = row["ReportName"],
                PageName = row["PageName"],
                VisualName = row["VisualName"],
                VisualTitle = row["VisualTitle"],
                Query = row["Query"],
                hasDimension = row["hasDimension"]
            });

            return Ok(jsonResult);
        }

        [HttpGet("progressBar")]
        public IActionResult ProgressBar()
        {
            int total = 0;
            int progress = 0;

            try
            {
                total = _allColumnCount.Rows.Count;
                foreach (DataRow row in _allColumnCount.Rows)
                {
                    progress += int.Parse(row["ProgressStatus"].ToString());
                }
            }
            catch { }

            var response = new Dictionary<string, int>{
            { "Total", total },
            { "Progress", progress }
            };

            return Ok(response);
        }

        [HttpGet("getloadtime")]
        public IActionResult GetLoadTime()
        {
            var jsonResult = _allCombinations.AsEnumerable().Select(row => new
            {
                UniqueID = row["UniqueID"],
                Measure = row["Measure"],
                DimensionName = row["DimensionName"],
                ColumnName = row["ColumnName"],
                LoadTime = row["LoadTime"],
                PreviousLoadTime = row["PreviousLoadTime"],
                isMeasureUsedInVisual = row["isMeasureUsedInVisual"],
                ReportName = row["ReportName"],
                PageName = row["PageName"],
                VisualName = row["VisualName"],
                VisualTitle = row["VisualTitle"],
                Query = row["Query"],
                hasDimension = row["hasDimension"]
            });

            return Ok(jsonResult);
        }

        [HttpPost("reload")]
        public IActionResult Reload(int uniqueID, string query)
        {
            _allCombinations.Rows[uniqueID - 1]["PreviousLoadTime"] = _allCombinations.Rows[uniqueID - 1]["LoadTime"];
            double loadTime = GetQueryExecutionTime(query, uniqueID - 1, _allCombinations, _con);

            return Ok(loadTime);
        }

        void ExecuteAllQuery(DataTable allQueries)
        {
            var semaphore = new SemaphoreSlim(10);
            List<Task> tasks = [];

            for (int i = 0; i < allQueries.Rows.Count; i++)
            {
                string query = allQueries.Rows[i]["Query"].ToString();
                int rowIndex = i;
                // GetQueryExecutionTime(query, rowIndex, allQueries);
                tasks.Add(Task.Run(async () =>
                {
                    await semaphore.WaitAsync();
                    try
                    {
                        using var connection = new AdomdConnection(_connectionString);
                        GetQueryExecutionTime(query, rowIndex, allQueries, connection);
                    }
                    finally
                    {
                        semaphore.Release();
                    }
                }));
            }
            Task.WhenAll(tasks).Wait();

            CreateExcelSheet(allQueries, "RES.xlsx");
        }


        double GetQueryExecutionTime(string query, int rowIndex, DataTable allQueries, dynamic connection)
        {
            connection.Open();
            var command = new AdomdCommand(query, connection);
            int CommandTimeout = (int)(_thresholdValue + 1);
            int thresholdTimeMS = (int)(_thresholdValue * 1000);
            command.CommandTimeout = CommandTimeout;
            double queryExecutionTime = 0;
            try
            {
                DateTime startTime = DateTime.Now;
                var cancellationTokenSource = new CancellationTokenSource();
                var executionTask = Task.Run(() =>
                {
                    using (cancellationTokenSource.Token.Register(() => command.Cancel()))
                    {
                        return command.ExecuteReader();
                    }
                });
                if (!executionTask.Wait(thresholdTimeMS))
                {
                    cancellationTokenSource.Cancel();
                    Console.WriteLine($"Query took too long to execute. Aborting query...");

                    queryExecutionTime = _thresholdValue;
                }
                else
                {
                    DateTime endTime = DateTime.Now;
                    queryExecutionTime = (endTime - startTime).TotalSeconds;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error executing query: {ex.Message}");
                queryExecutionTime = -1; // Error occurred
            }
            _con.Close();
            Console.WriteLine($"Query: {query}\nExecution time:{queryExecutionTime}");
            allQueries.Rows[rowIndex]["LoadTime"] = queryExecutionTime;
            return queryExecutionTime;

        }

        DataTable GetFinalColumns(DataTable tableQuery, DataTable columnsQuery)
        {
            var dfRows = tableQuery.AsEnumerable();
            var df1Rows = columnsQuery.AsEnumerable();
            List<Task> tasks = [];
            var semaphore = new SemaphoreSlim(10);

            // Perform inner join using LINQ
            var tableWithColumn = from row1 in dfRows
                                  join row2 in df1Rows
                                  on row1.Field<string>("TableID") equals row2.Field<string>("TableID")
                                  select new
                                  {
                                      TableName = row1.Field<string>("TableName"),
                                      TableID = row1.Field<string>("TableID"),
                                      ColumnName = row2.Field<string>("ColumnName"),
                                      ColumnID = row2.Field<string>("ColumnID")
                                  };

            DataTable df = ConvertToDataTable(tableWithColumn);

            df.Columns.Add("ValuesQuery", typeof(string));
            df.Columns.Add("ID", typeof(string));
            df.Columns.Add("Count", typeof(int));
            df.Columns.Add("ProgressStatus", typeof(int));

            for (int i = 0; i < df.Rows.Count; i++)
            {
                DataRow row = df.Rows[i];
                row["ValuesQuery"] = "WITH MEMBER [Measures].[Count] AS [" + row["TableName"] + "].[" + row["ColumnName"] + "].[" + row["ColumnName"] + "].Count SELECT {[Measures].[Count]} ON COLUMNS  FROM [Model]";
                row["ID"] = i + 1;
                row["ProgressStatus"] = 0;
            }

            _allColumnCount = df;
            for (int i = 0; i < _allColumnCount.Rows.Count; i++)
            {
                string query = _allColumnCount.Rows[i]["ValuesQuery"].ToString();
                int rowIndex = i;
                tasks.Add(Task.Run(async () =>
                {
                    await semaphore.WaitAsync();
                    try
                    {

                        using var connection = new AdomdConnection(_connectionString);
                        DataTable tempDF = ExecuteDataTable(query, ["Count"], connection);
                        _allColumnCount.Rows[rowIndex]["Count"] = tempDF.Rows[0]["Count"];
                        _allColumnCount.Rows[rowIndex]["ProgressStatus"] = 1;
                        Console.WriteLine(rowIndex + " " + _allColumnCount.Rows[rowIndex]["ColumnName"] + " Column Values Count: " + _allColumnCount.Rows[rowIndex]["Count"]);
                    }
                    catch
                    {
                        _allColumnCount.Rows[rowIndex]["Count"] = int.MaxValue;
                        _allColumnCount.Rows[rowIndex]["ProgressStatus"] = 1;
                        Console.WriteLine("Failed Column Values Count " + _allColumnCount.Rows[rowIndex]["ColumnName"]);
                    }
                    finally
                    {
                        semaphore.Release();
                    }
                }));
            }
            Task.WhenAll(tasks).Wait();

            DataTable RowNumberPerDimension = _allColumnCount;

            // Clone the structure to fix the issue
            DataTable newDataTable = RowNumberPerDimension.Clone();
            foreach (DataRow row in RowNumberPerDimension.Rows) { newDataTable.ImportRow(row); }
            RowNumberPerDimension = newDataTable;

            RowNumberPerDimension.DefaultView.Sort = "TableName ASC, Count ASC";
            RowNumberPerDimension = RowNumberPerDimension.DefaultView.ToTable();
            RowNumberPerDimension.Columns.Add("RowNumber", typeof(string));
            var groupedRows = RowNumberPerDimension.AsEnumerable()
            .GroupBy(row => row.Field<string>("TableName"));
            int rowCount = 0;
            foreach (var group in groupedRows)
            {
                int rowNumber = 1;
                foreach (DataRow row in group)
                {
                    RowNumberPerDimension.Rows[rowCount]["RowNumber"] = rowNumber++;
                    rowCount++;
                }
            }

            Dictionary<string, int> MeanRowNumber = new Dictionary<string, int>();

            foreach (DataRow row in RowNumberPerDimension.Rows)
            {
                string key = row["TableName"].ToString();
                int val = Convert.ToInt32(row["RowNumber"]);

                if (!MeanRowNumber.ContainsKey(key))
                {
                    MeanRowNumber.Add(key, val);
                }
                else
                {
                    if (val > MeanRowNumber[key])
                    {
                        MeanRowNumber[key] = val;
                    }
                }
            }


            DataTable MeanRowNumberdf = new();
            MeanRowNumberdf.Columns.Add("TableName", typeof(string));
            MeanRowNumberdf.Columns.Add("MeanRowNumber", typeof(string));

            foreach (KeyValuePair<string, int> kvp in MeanRowNumber)
            {
                DataRow newRow = MeanRowNumberdf.NewRow();
                newRow["TableName"] = kvp.Key;
                newRow["MeanRowNumber"] = Convert.ToInt32(Math.Ceiling(kvp.Value / 2.0));
                MeanRowNumberdf.Rows.Add(newRow);
            }

            DataTable finalColumns = new();
            finalColumns.Columns.Add("TableName", typeof(string));
            finalColumns.Columns.Add("ColumnName", typeof(string));
            finalColumns.Columns.Add("RowNumber", typeof(string));

            foreach (DataRow row in RowNumberPerDimension.Rows)
            {
                string tableName = row["TableName"].ToString();
                string columnName = row["ColumnName"].ToString();
                int rowNumber = Convert.ToInt32(row["RowNumber"]);

                foreach (DataRow meanRow in MeanRowNumberdf.Rows)
                {
                    if (tableName == meanRow["TableName"].ToString() && rowNumber == Convert.ToInt32(meanRow["MeanRowNumber"]))
                    {
                        finalColumns.Rows.Add(tableName, columnName, rowNumber);
                        break;
                    }
                }
            }
            CreateExcelSheet(finalColumns, "resultDataFrame.xlsx");
            return finalColumns;
        }

        DataTable GetReportData(string filePath)
        {
            // Extract ZIP file
            var extractPath = Path.Combine(Path.GetDirectoryName(filePath), Path.GetFileNameWithoutExtension(filePath));
            _extractPath = extractPath;
            ZipFile.ExtractToDirectory(filePath, extractPath, true);
            Console.WriteLine("Extraction complete");

            // Clean layout content
            var layoutPath = Path.Combine(extractPath, "Report", "Layout");
            var layoutContent = System.IO.File.ReadAllText(layoutPath);
            layoutContent = Regex.Replace(layoutContent, @"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "");

            // Deserialize layout content
            dynamic fileContents = JsonConvert.DeserializeObject(layoutContent);

            // Initialize DataTable
            DataTable dataTable = new();
            var columns = new[] { "PageName", "VisualName", "MeasureName", "ColumnName", "DimensionName", "VisualTitle" };
            foreach (var column in columns)
                dataTable.Columns.Add(column, typeof(string));

            dataTable.Columns.Add("ReportName", typeof(string)).DefaultValue = Path.GetFileNameWithoutExtension(filePath);

            // Extract relevant data
            foreach (var section in fileContents.sections)
            {
                var pageName = section.displayName;
                foreach (var container in section.visualContainers)
                {
                    dynamic visualData;
                    try
                    {
                        visualData = JObject.Parse(container.config.ToString()).singleVisual;
                        if (visualData.visualType == "textbox") continue;

                        var visualTitle = "";
                        try
                        {
                            visualTitle = visualData.vcObjects.title[0].properties.text.expr.Literal.Value;
                            visualTitle = visualTitle.Replace("'", "").Replace(",", "");
                        }
                        catch { }

                        var visualName = visualData.visualType;
                        var tableMapping = new Dictionary<string, string>();
                        foreach (var item in visualData.prototypeQuery.From)
                            tableMapping[item.Name.ToString()] = item.Entity.ToString();

                        var columnList = new List<string>();
                        var measureList = new List<string>();
                        var dimensionList = new List<string>();
                        foreach (var item in visualData.prototypeQuery.Select)
                        {
                            if (item.Column != null)
                            {
                                columnList.Add(item.Column.Property.ToString());
                                var dimension = item.Column.Expression.SourceRef.Source.ToString();
                                dimensionList.Add(tableMapping[dimension]);
                            }
                            if (item.Measure != null)
                                measureList.Add(item.Measure.Property.ToString());
                        }

                        // Insert DataTable rows
                        foreach (var measure in measureList)
                        {
                            var hasColumns = columnList.Count > 0;
                            if (!hasColumns)
                            {
                                dataTable.Rows.Add(pageName, visualName, measure, "", "", visualTitle);
                            }
                            else
                            {
                                for (int i = 0; i < columnList.Count; i++)
                                {
                                    dataTable.Rows.Add(pageName, visualName, measure, columnList[i], dimensionList[i], visualTitle);
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error processing container: {ex.Message}");
                    }
                }
            }

            // Save DataTable to Excel
            CreateExcelSheet(dataTable, "dataTable.xlsx");
            Console.WriteLine("Created Array");
            return dataTable;
        }


        DataTable GetAllCombination(DataTable measureListSQLQuery, DataTable measureReferenceQuery, DataTable relationshipQuery, DataTable tableQuery, DataTable finalColumns, DataTable columnsQuery)
        {
            DataTable parsedDataFrame = _reportData;

            DataTable MeasureTimeWithDimensions = new();

            DataTable TempMeasureCalculationQuery = measureListSQLQuery;
            DataTable MeasureReferences = measureReferenceQuery;
            DataTable Relationships = relationshipQuery;
            DataTable Tables = tableQuery;
            DataTable FinalColumnsFromTables = finalColumns;
            DataTable Columns = columnsQuery;

            var tempMeasureCalculationQueryRows = TempMeasureCalculationQuery.AsEnumerable();
            var measureReferencesRows = MeasureReferences.AsEnumerable();
            var relationshipsRows = Relationships.AsEnumerable();
            var tablesRows = Tables.AsEnumerable();
            var finalColumnsFromTablesRows = FinalColumnsFromTables.AsEnumerable();
            var columnsRows = Columns.AsEnumerable();

            var query = from relationship in relationshipsRows
                        join fromTable in tablesRows
                            on relationship.Field<string>("FromTableID") equals fromTable.Field<string>("TableID")
                        join toTable in tablesRows
                            on relationship.Field<string>("ToTableID") equals toTable.Field<string>("TableID")
                        join fromColumn in columnsRows
                            on relationship.Field<string>("FromColumnID") equals fromColumn.Field<string>("ColumnID")
                        join toColumn in columnsRows
                            on relationship.Field<string>("ToColumnID") equals toColumn.Field<string>("ColumnID")
                        join measureReference in measureReferencesRows
                            on fromTable.Field<string>("TableName") equals measureReference.Field<string>("Referenced_Table")
                        join tempMeasureCalculation in tempMeasureCalculationQueryRows
                            on measureReference.Field<string>("Measure") equals tempMeasureCalculation.Field<string>("Measure")
                        join finalColumnFromTable in finalColumnsFromTablesRows
                            on toTable.Field<string>("TableName") equals finalColumnFromTable.Field<string>("TableName")
                        select new
                        {
                            FromTableID = fromTable.Field<string>("TableID"),
                            FromColumnID = fromColumn.Field<string>("ColumnID"),
                            ToTableID = toTable.Field<string>("TableID"),
                            ToColumnID = toColumn.Field<string>("ColumnID"),
                            FromTableName = fromTable.Field<string>("TableName"),
                            ToTableName = toTable.Field<string>("TableName"),
                            FromColumnName = fromColumn.Field<string>("ColumnName"),
                            ToColumnName = toColumn.Field<string>("ColumnName"),
                            Measure = tempMeasureCalculation.Field<string>("Measure"),
                            Referenced_Table = measureReference.Field<string>("Referenced_Table"),
                            MeasureGroup = tempMeasureCalculation.Field<string>("MeasureGroup"),
                            EXPRESSION = tempMeasureCalculation.Field<string>("EXPRESSION"),
                            CubeName = tempMeasureCalculation.Field<string>("CubeName"),
                            TableName = finalColumnFromTable.Field<string>("TableName"),
                            ColumnName = finalColumnFromTable.Field<string>("ColumnName"),
                            RowNumber = finalColumnFromTable.Field<string>("RowNumber"),
                        };

            DataTable MeasuresWithDimensions = ConvertToDataTable(query);

            CreateExcelSheet(MeasuresWithDimensions, "MeasuresWithDimensions.xlsx");

            MeasureTimeWithDimensions.Columns.Add("Measure", typeof(string));
            MeasureTimeWithDimensions.Columns.Add("MeasureGroup", typeof(string));
            MeasureTimeWithDimensions.Columns.Add("EXPRESSION", typeof(string));
            MeasureTimeWithDimensions.Columns.Add("CubeName", typeof(string));
            MeasureTimeWithDimensions.Columns.Add("ColumnName", typeof(string));
            MeasureTimeWithDimensions.Columns.Add("DimensionName", typeof(string));
            MeasureTimeWithDimensions.Columns.Add("Query", typeof(string));
            MeasureTimeWithDimensions.Columns.Add("WithDimension", typeof(string));

            foreach (DataRow row in MeasuresWithDimensions.Rows)
            {
                MeasureTimeWithDimensions.Rows.Add(
                    row["Measure"],
                    row["MeasureGroup"],
                    row["EXPRESSION"],
                    row["CubeName"],
                    row["ColumnName"],
                    row["ToTableName"],
                    string.Equals(row["ColumnName"].ToString(), "NULL", StringComparison.OrdinalIgnoreCase) ? "" : $"SELECT [{row["Measure"]}] ON 0, NON EMPTY {{[{row["ToTableName"]}].[{row["ColumnName"]}].children}} ON 1 FROM [{row["CubeName"]}]",
                    1
                );
            }
            CreateExcelSheet(MeasureTimeWithDimensions, "MeasureTimeWithDimensions.xlsx");



            MeasuresWithDimensions = MeasureTimeWithDimensions;


            DataTable MeasureTimeWithoutDimensions = new();
            DataTable TempMeasureCalculation = measureListSQLQuery;
            MeasureTimeWithoutDimensions.Columns.Add("Measure", typeof(string));
            MeasureTimeWithoutDimensions.Columns.Add("MeasureGroup", typeof(string));
            MeasureTimeWithoutDimensions.Columns.Add("EXPRESSION", typeof(string));
            MeasureTimeWithoutDimensions.Columns.Add("CubeName", typeof(string));
            MeasureTimeWithoutDimensions.Columns.Add("Query", typeof(string));
            MeasureTimeWithoutDimensions.Columns.Add("WithDimension", typeof(string));
            MeasureTimeWithoutDimensions.Columns.Add("DimensionName", typeof(string));
            MeasureTimeWithoutDimensions.Columns.Add("ColumnName", typeof(string));

            foreach (DataRow row in TempMeasureCalculation.Rows)
            {
                MeasureTimeWithoutDimensions.Rows.Add(
                row["Measure"],
                row["MeasureGroup"],
                row["EXPRESSION"],
                row["CubeName"],
                $"SELECT [Measures].[{row["Measure"]}] ON 0 FROM [{row["CubeName"]}]",
                0,
                DBNull.Value,
                DBNull.Value
                );

            }
            CreateExcelSheet(MeasureTimeWithoutDimensions, "MeasureTimeWithoutDimensions.xlsx");





            DataTable MeasuresWithoutDimensions = MeasureTimeWithoutDimensions;

            // Add columns with default values directly
            MeasuresWithDimensions.Columns.Add("LoadTime", typeof(string)).DefaultValue = "x";
            MeasuresWithDimensions.Columns.Add("isMeasureUsedInVisual", typeof(string)).DefaultValue = "0";
            MeasuresWithDimensions.Columns.Add("PageName", typeof(string)).DefaultValue = "-";
            MeasuresWithDimensions.Columns.Add("VisualName", typeof(string)).DefaultValue = "-";
            MeasuresWithDimensions.Columns.Add("VisualTitle", typeof(string)).DefaultValue = "-";
            MeasuresWithDimensions.Columns.Add("ReportName", typeof(string)).DefaultValue = "-";
            MeasuresWithDimensions.Columns.Add("hasDimension", typeof(string)).DefaultValue = "1";

            foreach (DataRow row in MeasuresWithDimensions.Rows)
            {
                row["LoadTime"] = "x";
                row["isMeasureUsedInVisual"] = "0";
                row["PageName"] = "-";
                row["VisualName"] = "-";
                row["VisualTitle"] = "-";
                row["ReportName"] = "-";
                row["hasDimension"] = "1";
            }

            MeasuresWithoutDimensions.Columns.Add("LoadTime", typeof(string)).DefaultValue = "x";
            MeasuresWithoutDimensions.Columns.Add("isMeasureUsedInVisual", typeof(string)).DefaultValue = "0";
            MeasuresWithoutDimensions.Columns.Add("PageName", typeof(string)).DefaultValue = "-";
            MeasuresWithoutDimensions.Columns.Add("VisualName", typeof(string)).DefaultValue = "-";
            MeasuresWithoutDimensions.Columns.Add("VisualTitle", typeof(string)).DefaultValue = "-";
            MeasuresWithoutDimensions.Columns.Add("ReportName", typeof(string)).DefaultValue = "-";
            MeasuresWithoutDimensions.Columns.Add("hasDimension", typeof(string)).DefaultValue = "0";

            foreach (DataRow row in MeasuresWithoutDimensions.Rows)
            {
                row["LoadTime"] = "x";
                row["isMeasureUsedInVisual"] = "0";
                row["PageName"] = "-";
                row["VisualName"] = "-";
                row["VisualTitle"] = "-";
                row["ReportName"] = "-";
                row["hasDimension"] = "0";
            }


            // Set default values for parsedDataFrame
            parsedDataFrame.Columns.Add("LoadTime", typeof(string));
            parsedDataFrame.Columns.Add("isMeasureUsedInVisual", typeof(string));
            parsedDataFrame.Columns.Add("hasDimension", typeof(string));
            foreach (DataRow row in parsedDataFrame.Rows)
            {
                row["LoadTime"] = "x";
                row["isMeasureUsedInVisual"] = "1";
                row["hasDimension"] = "0";
            }

            // Rename columns and add Query column
            parsedDataFrame.Columns["MeasureName"].ColumnName = "Measure";
            parsedDataFrame.Columns.Add("Query", typeof(string)).DefaultValue = ""; ;

            // Populate Query column based on column values
            foreach (DataRow row in parsedDataFrame.Rows)
            {
                if (row["ColumnName"].ToString() == "")
                {
                    row["Query"] = $"SELECT [Measures].[{row["Measure"]}] ON 0 FROM [{MeasuresWithDimensions.Rows[0]["CubeName"]}]";
                }
                else
                {
                    row["Query"] = $"SELECT [Measures].[{row["Measure"]}] ON 0, NON EMPTY [{row["DimensionName"]}].[{row["ColumnName"]}].Children ON 1 FROM [{MeasuresWithDimensions.Rows[0]["CubeName"]}]";
                }
            }

            // Group parsedDataFrame by Measure and select the first row of each group
            DataTable tempDF = parsedDataFrame.AsEnumerable()
                .GroupBy(r => r.Field<string>("Measure"))
                .Select(g => g.First())
                .CopyToDataTable();
            CreateExcelSheet(tempDF, "tempDF.xlsx");


            Console.WriteLine("Done till here.");



            var leftQuery = (
            from tempRow in tempDF.AsEnumerable()
            join measuresRow in MeasuresWithoutDimensions.AsEnumerable()
            on tempRow.Field<string>("Measure") equals measuresRow.Field<string>("Measure") into temp
            from measuresRow in temp.DefaultIfEmpty()
            where measuresRow == null
            select new
            {
                Measure = tempRow?["Measure"],
                ColumnName_x = tempRow?["ColumnName"],
                DimensionName_x = tempRow?["DimensionName"],
                ReportName_x = tempRow?["ReportName"],
                hasDimension_x = tempRow?["hasDimension"],
                MeasureGroup = measuresRow?["MeasureGroup"], // Add null-conditional operator here
                EXPRESSION = measuresRow?["EXPRESSION"],
                Query_y = measuresRow?["Query"],             // Add null-conditional operator here
                WithDimension = measuresRow?["WithDimension"],// Add null-conditional operator here
                DimensionName_y = measuresRow?["DimensionName"], // Add null-conditional operator here
                ColumnName_y = measuresRow?["ColumnName"],   // Add null-conditional operator here
                LoadTime_y = measuresRow?["LoadTime"],       // Add null-conditional operator here
                ReportName_y = measuresRow?["ReportName"],   // Add null-conditional operator here
                hasDimension_y = measuresRow?["hasDimension"] // Add null-conditional operator here
            }
        );
            // Merge tempDF with MeasuresWithoutDimensions to find missing measures
            var rightQuery = (
            from measuresRow in MeasuresWithoutDimensions.AsEnumerable()
            join tempRow in tempDF.AsEnumerable()
            on measuresRow.Field<string>("Measure") equals tempRow.Field<string>("Measure") into temp
            from tempRow in temp.DefaultIfEmpty()
            where tempRow == null
            select new
            {
                Measure = measuresRow?["Measure"],
                ColumnName_x = tempRow?["ColumnName"],
                DimensionName_x = tempRow?["DimensionName"],
                ReportName_x = tempRow?["ReportName"],
                hasDimension_x = tempRow?["hasDimension"],
                MeasureGroup = measuresRow?["MeasureGroup"], // Add null-conditional operator here
                EXPRESSION = measuresRow?["EXPRESSION"],
                Query_y = measuresRow?["Query"],             // Add null-conditional operator here
                WithDimension = measuresRow?["WithDimension"],// Add null-conditional operator here
                DimensionName_y = measuresRow?["DimensionName"], // Add null-conditional operator here
                ColumnName_y = measuresRow?["ColumnName"],   // Add null-conditional operator here
                LoadTime_y = measuresRow?["LoadTime"],       // Add null-conditional operator here
                ReportName_y = measuresRow?["ReportName"],   // Add null-conditional operator here
                hasDimension_y = measuresRow?["hasDimension"]
            }
        );

            var finalQuery = leftQuery.Union(rightQuery);
            var mergedDF = ConvertToDataTable(finalQuery);

            CreateExcelSheet(mergedDF, "mergedDF.xlsx");

            mergedDF.Columns["LoadTime_y"].ColumnName = "LoadTime";
            mergedDF.Columns["Query_y"].ColumnName = "Query";

            // Add additional columns to the mergedDF DataTable
            mergedDF.Columns.Add("isMeasureUsedInVisual", typeof(string));
            mergedDF.Columns.Add("PageName", typeof(string));
            mergedDF.Columns.Add("VisualName", typeof(string));
            mergedDF.Columns.Add("VisualTitle", typeof(string));
            mergedDF.Columns.Add("ColumnName", typeof(string));
            mergedDF.Columns.Add("DimensionName", typeof(string));
            mergedDF.Columns.Add("hasDimension", typeof(string));


            // Assign default values to the additional columns in each row
            foreach (DataRow row in mergedDF.Rows)
            {
                row["isMeasureUsedInVisual"] = "0";
                row["PageName"] = "-";
                row["VisualName"] = "-";
                row["VisualTitle"] = "-";
                row["ColumnName"] = "-";
                row["DimensionName"] = "-";
                row["hasDimension"] = "0";
            }


            // Concatenate parsedDataFrame, mergedDF, and MeasuresWithDimensions
            var possibleCombinations = new DataTable();
            possibleCombinations.Merge(parsedDataFrame);
            possibleCombinations.Merge(mergedDF);
            possibleCombinations.Merge(MeasuresWithDimensions);

            possibleCombinations.Columns.Add("PreviousLoadTime", typeof(string));
            possibleCombinations.Columns.Add("UniqueID", typeof(int));

            for (int i = 0; i < possibleCombinations.Rows.Count; i++)
            {
                possibleCombinations.Rows[i]["UniqueID"] = i + 1;
                possibleCombinations.Rows[i]["PreviousLoadTime"] = "--";
            }

            possibleCombinations = possibleCombinations.DefaultView.ToTable(false, "UniqueID",
                "Measure", "DimensionName", "ColumnName", "LoadTime", "PreviousLoadTime", "isMeasureUsedInVisual",
                "ReportName", "PageName", "VisualName", "VisualTitle", "Query", "hasDimension");


            CreateExcelSheet(possibleCombinations, "possibleCombinations.xlsx");

            return possibleCombinations;

        }


        void CreateExcelSheet(DataTable dataTable, string ExcelName)
        {
            var excelFileName = Path.Combine(_extractPath, ExcelName);
            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add(dataTable, "Sheet1");
                workbook.SaveAs(excelFileName);
            }

            Console.WriteLine("Saved DataTable to Excel file: " + excelFileName);
        }

        DataTable ExecuteDataTable(string query, List<string> columnsList, dynamic connection)
        {
            connection.Open();
            var command = new AdomdCommand(query, connection);
            var reader = command.ExecuteReader();


            DataTable dataTable = new();
            for (int i = 0; i < reader.FieldCount; i++)
            {
                dataTable.Columns.Add(columnsList[i], typeof(string));
            }

            while (reader.Read())
            {
                DataRow row = dataTable.NewRow();
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var columnData = reader[i] != null ? reader[i] : "";
                    row[$"{columnsList[i]}"] = columnData.ToString();
                }
                dataTable.Rows.Add(row);
            }

            connection.Close();

            return dataTable;
        }

        DataTable ConvertToDataTable(IEnumerable dataRows)
        {
            DataTable dataTable = new();
            List<string> columnList = [];

            Type? itemType = null;
            foreach (var item in dataRows)
            {
                itemType = item.GetType();
                break;
            }

            foreach (var column in itemType.GetProperties().Select(prop => prop.Name))
            {
                dataTable.Columns.Add(column, typeof(string));
                columnList.Add(column);
            }

            // Add rows from the LINQ query result to the DataTable
            foreach (var row in dataRows)
            {
                DataRow newRow = dataTable.NewRow();
                foreach (var column in columnList)
                {
                    // Access property dynamically using reflection
                    object? columnValue = row.GetType().GetProperty(column)?.GetValue(row);
                    newRow[column] = columnValue != null ? columnValue.ToString() : string.Empty;
                }
                dataTable.Rows.Add(newRow);
            }

            return dataTable;
        }

        [HttpGet("sub")]
        public IActionResult Sub(int number1, int number2)
        {
            int result = number1 + number2;
            return Ok(result);
        }
    }

    public class AnalyzeRequest
    {
        public string EndPoint { get; internal set; }
    }

    public class ConnectionsValue
    {
        public int Number1 { get; set; }
        public int Number2 { get; set; }
    }
}
