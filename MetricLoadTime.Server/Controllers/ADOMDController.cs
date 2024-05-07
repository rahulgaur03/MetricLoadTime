using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Data;
using System.Diagnostics;
using Microsoft.AnalysisServices.AdomdClient;
using ClosedXML.Excel;
using System.IO.Compression;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Text.RegularExpressions;
using System.Collections;
using DocumentFormat.OpenXml.Drawing.Diagrams;
using System.Runtime.CompilerServices;



namespace MetricLoadTime.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ADOMDController : ControllerBase
    {
        [HttpGet("analyze")]
        public IActionResult Analyze(string filePath, string modelName, string endPoint, float thresholdValue, int runningFirstTime, string userName, string pass)
        {
            GetReportData(filePath);

            var checkforlocal = "N";
            var connectionstring = "Provider=MSOLAP.8;Integrated Security=SSPI;Persist Security Info=True;Initial Catalog=b45e4eee-a93c-4fb8-a3a7-108c5ed3edb4;Data Source=localhost:52797;MDX Compatibility=1;Safety Options=2;MDX Missing Member Mode=Error;Update Isolation Level=2";
            var con = new AdomdConnection();

            if (checkforlocal == "Y" || checkforlocal == "y")
            {
                connectionstring = connectionstring;
            }
            else
            {
                connectionstring = "Provider=MSOLAP.8;Data Source=" + endPoint + ";initial catalog=" + modelName + ";UID=;PWD=";
                // connectionstring = "Provider=MSOLAP.8;Data Source=" + endPoint + ";initial catalog=" + modelName + ";UID=" + userName + ";PWD=" + pass + "";
            }

            con.ConnectionString = connectionstring;
            con.Open();
            con.Close();

            var measureListSQLQuery = ExecuteDataTable(con,
                "SELECT [MEASURE_NAME],[MEASUREGROUP_NAME],[EXPRESSION],[CUBE_NAME] FROM $SYSTEM.MDSCHEMA_MEASURES WHERE MEASURE_IS_VISIBLE AND MEASUREGROUP_NAME <> 'Reporting Filters' ORDER BY [MEASUREGROUP_NAME]",
                new List<string> { "Measure", "MeasureGroup", "Expression", "CubeName" }
            );

            var measureReferenceQuery = ExecuteDataTable(con,
                "SELECT DISTINCT [Object], [Referenced_Table] FROM $SYSTEM.DISCOVER_CALC_DEPENDENCY WHERE [Object_Type] = 'MEASURE'",
                new List<string> { "Measure", "Referenced_Table" }
            );

            var relationshipQuery = ExecuteDataTable(con,
                "SELECT DISTINCT [FromTableID], [FromColumnID], [ToTableID], [ToColumnID] FROM $SYSTEM.TMSCHEMA_RELATIONSHIPS WHERE [IsActive]",
                new List<string> { "FromTableID", "FromColumnID", "ToTableID", "ToColumnID" }
            );

            var tableQuery = ExecuteDataTable(con,
                "SELECT DISTINCT [Name], [ID] FROM $SYSTEM.TMSCHEMA_TABLES",
                new List<string> { "TableName", "TableID" }
            );

            var columnsQuery = ExecuteDataTable(con,
                "SELECT DISTINCT [TableID], [ExplicitName], [ID] FROM $SYSTEM.TMSCHEMA_COLUMNS WHERE [Type] <> 3 AND NOT [IsDefaultImage] AND [State] = 1",
                new List<string> { "TableID", "ColumnName", "ColumnID" }
            );

            GetFinalColumns(con, tableQuery, columnsQuery);

            return Ok(1);
        }

        DataTable GetFinalColumns(dynamic con, DataTable tableQuery, DataTable columnsQuery)
        {
            var dfRows = tableQuery.AsEnumerable();
            var df1Rows = columnsQuery.AsEnumerable();

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

            for (int i = 0; i < df.Rows.Count; i++)
            {
                DataRow row = df.Rows[i];
                row["ValuesQuery"] = "WITH MEMBER [Measures].[Count] AS [" + row["TableName"] + "].[" + row["ColumnName"] + "].[" + row["ColumnName"] + "].Count SELECT {[Measures].[Count]} ON COLUMNS  FROM [Model]";
                row["ID"] = i + 1;
            }

            df.Columns.Add("Count", typeof(int));
            for (int i = 0; i < df.Rows.Count; i++)
            {
                DataRow row = df.Rows[i];

                string query = row["ValuesQuery"].ToString();
                try
                {
                    List<string> columnsList = new List<string> { "Count" };
                    DataTable tempDF = ExecuteDataTable(con, query, columnsList);
                    df.Rows[i]["Count"] = tempDF.Rows[0]["Count"];
                    Console.WriteLine(tempDF.Rows[0]["Count"]);
                    Console.WriteLine("Column Values Count queries are running....");

                }
                catch
                {
                    df.Rows[i]["Count"] = int.MaxValue;
                    Console.WriteLine("Failed Column Values Count queries are running....");
                    Debug.WriteLine(query);

                }
            }
            DataTable ColumnValuesCount = df;
            DataTable RowNumberPerDimension = ColumnValuesCount;
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


            DataTable MeanRowNumberdf = new DataTable();
            MeanRowNumberdf.Columns.Add("TableName", typeof(string));
            MeanRowNumberdf.Columns.Add("MeanRowNumber", typeof(string));

            foreach (KeyValuePair<string, int> kvp in MeanRowNumber)
            {
                DataRow newRow = MeanRowNumberdf.NewRow();
                newRow["TableName"] = kvp.Key;
                newRow["MeanRowNumber"] = Convert.ToInt32(Math.Ceiling(kvp.Value / 2.0));
                MeanRowNumberdf.Rows.Add(newRow);
            }

            DataTable finalColumns = new DataTable();
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
            CreateExcelSheet("C:\\Users\\RahulGaurMAQSoftware\\Downloads\\CIP\\Refresh Tracker", finalColumns, "resultDataFrame.xlsx");
            return finalColumns;
        }

        void GetReportData(string filePath)
        {
            // Extract ZIP file
            var extractPath = Path.Combine(Path.GetDirectoryName(filePath), Path.GetFileNameWithoutExtension(filePath));
            ZipFile.ExtractToDirectory(filePath, extractPath, true);
            Console.WriteLine("Extraction complete");

            // Clean layout content
            var layoutPath = Path.Combine(extractPath, "Report", "Layout");
            var layoutContent = System.IO.File.ReadAllText(layoutPath);
            layoutContent = Regex.Replace(layoutContent, @"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "");

            // Deserialize layout content
            dynamic fileContents = JsonConvert.DeserializeObject(layoutContent);

            // Initialize DataTable
            DataTable dataTable = new DataTable();
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
                    dynamic visualData = null;
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
            CreateExcelSheet(extractPath, dataTable, "dataTable.xlsx");
            Console.WriteLine("Created Array");
        }
        void CreateExcelSheet(string extractPath, DataTable dataTable, string ExcelName)
        {
            var excelFileName = Path.Combine(extractPath, ExcelName);
            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add(dataTable, "Sheet1");
                workbook.SaveAs(excelFileName);
            }

            Console.WriteLine("Saved DataTable to Excel file: " + excelFileName);
        }

        DataTable ExecuteDataTable(dynamic con, string query, List<string> columnsList)
        {
            try
            {
                con.Open();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Connection Issue: {ex.Message}");
            }

            var command = new AdomdCommand(query, con);
            var reader = command.ExecuteReader();


            DataTable dataTable = new DataTable();
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

            con.Close();

            return dataTable;
        }

        DataTable ConvertToDataTable(IEnumerable dataRows)
        {
            DataTable dataTable = new DataTable();
            List<string> columnList = new List<string>();

            Type itemType = null;
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
                    object columnValue = row.GetType().GetProperty(column)?.GetValue(row);
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

        // Add more methods for other operations like subtraction, multiplication, division, etc.
    }

    public class ConnectionsValue
    {
        public int Number1 { get; set; }
        public int Number2 { get; set; }
    }
}
