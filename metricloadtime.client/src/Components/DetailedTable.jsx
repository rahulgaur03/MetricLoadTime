// import * as React from "react";
// import { DataGrid } from "@mui/x-data-grid";
// import { useState } from "react";
import { FaClock } from "react-icons/fa";
import {
  Box,
} from '@mui/material';


// const columns = [
//   { field: "Measure", headerName: "Measure", width: 350 },
//   {
//     field: "DimensionName",
//     headerName: "Dimension Name",
//     width: 180,
//     sortable: true,
//   },
//   {
//     field: "ColumnName",
//     headerName: "Column Name",
//     width: 130,
//     sortable: true,
//   },
//   {
//     field: "LoadTime",
//     headerName: "Load Time",
//     type: "number",
//     width: 90
//     // renderCell: () => {
//     //   return <FaClock />;
//     // },
//   },
//   { field: "ReportName", headerName: "Report Name", width: 160 },
//   { field: "PageName", headerName: "Page Name", width: 100 },
//   { field: "VisualName", headerName: "Visual Name", width: 80 },
//   { field: "VisualTitle", headerName: "Visual Title", width: 180 },
// ];

// const rows = [
//   { id: 1, lastName: "Snow", firstName: "Jon", age: 35 },
//   { id: 2, lastName: "Lannister", firstName: "Cersei", age: 42 },
//   { id: 3, lastName: "Lannister", firstName: "Jaime", age: 45 },
//   { id: 4, lastName: "Stark", firstName: "Arya", age: 16 },
//   { id: 5, lastName: "Targaryen", firstName: "Daenerys", age: null },
//   { id: 6, lastName: "Melisandre", firstName: null, age: 150 },
//   { id: 7, lastName: "Clifford", firstName: "Ferrara", age: 44 },
//   { id: 8, lastName: "Frances", firstName: "Rossini", age: 36 },
//   { id: 9, lastName: "Roxie", firstName: "Harvey", age: 65 },
// ];

// export default function DataTable({ combinations }) {
//   const [initialcombinations, setinitialcombinations] = useState(combinations.results);
//   console.log(initialcombinations)


  
//   const updateArray = (arrayB) => {
//     setinitialcombinations(prevArrayA => {
//       return prevArrayA.map((aItem, index) => {
//         const bItem = arrayB[index];
//         if (!bItem) return aItem; // If bItem is null or undefined, keep the original item in 'a'
//         const aKeys = Object.keys(aItem);
//         const bKeys = Object.keys(bItem);
//         if (
//           aKeys.length === bKeys.length &&
//           aKeys.every(key => bKeys.includes(key)) &&
//           aKeys.every(key => key === 'LoadTime' || aItem[key] === bItem[key])
//         ) {
//           // If all keys' values match with 'b' except 'LoadTime', update 'LoadTime' in 'a' with 'b'
//           return { ...aItem, LoadTime: bItem.LoadTime };
//         } else {
//           return aItem; // If keys or values don't match, keep the original item in 'a'
//         }
//       });
//     });
//   };
//   // React.useEffect(() => {

//   // }, []);
//   // console.log(intialcombinations)
//   React.useEffect(() => {
//     // setinitialcombinations(combinations)
//     // console.log(intialcombinations)

//     const extractedParams = initialcombinations //.map(({ Query }) => ({ Query }));

//     // Function to call API in batches
//     const callApiInBatches = async () => {
//       const batchSize = 5;
//       const numBatches = Math.ceil(initialcombinations.length / batchSize);

//       // Iterate through batches
//       for (let i = 0; i < numBatches; i++) {
//         const startIdx = i * batchSize;
//         const endIdx = Math.min(
//           startIdx + batchSize,
//           initialcombinations.length
//         );
//         const batchParams = extractedParams.slice(startIdx, endIdx);
//         console.log(batchParams)
//         // const raw = JSON.stringify({
//         //   "connection_string":combinations.connection_string,
//         //   "query":  initialcombinations.slice(startIdx, endIdx);
//         // });

//         try {
//           // Make API call for the current batch
//           const response = await fetch("http://127.0.0.1:3002/firequery", {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//             },
//             body: JSON.stringify({
//               query: batchParams,
//               connection_string: combinations.connectionString,
//               threshold_time: 5,
//             }),
//           });

//           if (!response.ok) {
//             throw new Error("API call failed");
//           }

//           const data = await response.json();
//           // Handle response data as needed
//           // console.log(JSON.parse(data).results);
//           updateArray(JSON.parse(data).results)
//         } catch (error) {
//           console.error("Error calling API:", error);
//           // Handle error
//         }
//       }
//     };

//     callApiInBatches();
//   }, []); // Call API when component mounts

//   return (
//     <div style={{ height: "70vh", width: "100%" }}>
//       <DataGrid
//         rows={initialcombinations}
//         columns={columns}
//         initialState={{
//           pagination: {
//             paginationModel: { page: 0, pageSize: 100 },
//           },
//         }}
//         sx={{
//           fontSize: "smaller",
//         }}
//         pageSizeOptions={[100, 200]}
//         hideFooterPagination={true}
//         getRowId={(row) => row.Measure + row.DimensionName + row.ColumnName + row.PageName + row.VisualTitle + row.ReportName + row.VisualName}
//         checkboxSelection
//       />
//     </div>
//   );
// }


import React, { useEffect, useMemo, useState } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import axios from "axios";


const Example = ({combinations}) => {

  const [initialcombinations, setinitialcombinations] = useState(combinations.results);
  const [rowSelection, setRowSelection] = useState({});

  console.log(initialcombinations)

  const updateArray = (arrayB) => {
    setinitialcombinations(prevArrayA => {
        return prevArrayA.map((aItem, index) => {
            const bItem = arrayB.find(item => item.uniqueID === aItem.uniqueID);
            if (bItem && aItem.loadTime !== bItem.loadTime) {
                return { ...aItem, loadTime: bItem.loadTime, previousLoadTime: bItem.previousLoadTime };
            } else {
                return aItem;
            }
        });
    });
};

const handleReload = () =>
{
  const fetchData = async () => {
    const fetchedQueries = [];
    for (const id in rowSelection) {
      const matchingCombination = initialcombinations.find((c) => c.uniqueID.toString() === id);
      if (matchingCombination) {
        try {
          const response = await axios.post('http://localhost:8001/api/adomd/reload', {
             uniqueID: id, Query: matchingCombination.query 
          });
          // fetchedQueries.push({ uniqueID: row.uniqueID, query: response.data });
          console.log(response.data)
          updateArray(response.data)
          setTimeout(() => {
            setRowSelection({})
          }, 2000);
        } catch (error) {
          console.error(`Failed to fetch query for ID ${id}: ${error.message}`);
        }
      } else {
        console.warn(`No matching combination found for ID ${id}`);
      }
    }
  };

  fetchData();
}



  const intervalId = setInterval(async () => {
    try {

      const loadTimes = initialcombinations.map(entry => entry.loadTime);
      if(loadTimes.includes("x") == false){
        clearInterval(intervalId); // Stop polling if generateCombinationsPromise is resolved
      }
      else{
        let generateCombinationsPromise


        generateCombinationsPromise = fetch('api/adomd/getloadtime', {
          method: 'GET',
        });

        

        if (generateCombinationsPromise) {
          const generateCombinationsResponse = await generateCombinationsPromise;
          if (generateCombinationsResponse.ok) {
            // console.log(generateCombinationsResponse.json())
            generateCombinationsResponse.clone().json().then(results => setinitialcombinations(results));
            clearInterval(intervalId); // Stop polling if generateCombinationsPromise is resolved
          } else {
            clearInterval(intervalId); // Stop polling if generateCombinationsPromise fails
          }
        }
      }
    } catch (error) {
      console.error(error);
      // Handle error
    }
  }, 5000); // Adjust polling interval as needed



const columns = useMemo(
    () => [
      {
        accessorKey: 'measure',
        header: 'Measure',
      },
      {
        accessorKey: 'dimensionName',
        header: 'Dimension Name',
      },
      {
        accessorKey: 'columnName',
        header: 'Column Name',
      },
      {
        accessorKey: 'loadTime',
        header: 'Load Time',
      },
      {
        accessorKey: 'previousLoadTime',
        header: 'Previous Load Time',
      },
      {
        accessorKey: 'reportName',
        header: 'Report Name',
      },
      {
        accessorKey: 'pageName',
        header: 'Page Name',
      },
      {
        accessorKey: 'visualName',
        header: 'Visual Name',
      },
      {
        accessorKey: 'visualTitle',
        header: 'Visual Title',
      },
    ],
    [],
  );



  console.log(rowSelection)


  
  const table = useMaterialReactTable({
    columns,
    data : initialcombinations,
    enableRowSelection: true,
    getRowId:(row) => row.uniqueID,
    state: { rowSelection }, 
    onRowSelectionChange: setRowSelection,
    // enablePagination: false,

  });

  // useEffect(() => {
  //   console.info({ rowSelection }); 
  // }, [rowSelection]);

  return(
  <div>
    <button type="button" class="btn btn-danger" onClick={handleReload} >Reload</button>

    <MaterialReactTable table={table} />;
  </div>
  )
};

export default Example;
