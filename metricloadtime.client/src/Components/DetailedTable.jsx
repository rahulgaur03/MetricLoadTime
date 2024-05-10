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
//   const [initialcombinations, setinitialcombinations] = useState(combinations.result);
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
//           // console.log(JSON.parse(data).result);
//           updateArray(JSON.parse(data).result)
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


const Example = ({combinations}) => {

  const [initialcombinations, setinitialcombinations] = useState(combinations.result);

  const updateArray = (arrayB) => {
    setinitialcombinations(prevArrayA => {
        return prevArrayA.map((aItem, index) => {
            const bItem = arrayB.find(item => item.UniqueID === aItem.UniqueID);
            if (bItem && aItem.LoadTime !== bItem.LoadTime) {
                return { ...aItem, LoadTime: bItem.LoadTime };
            } else {
                return aItem;
            }
        });
    });
};


  React.useEffect(() => {
    // const extractedParams = initialcombinations 
    const extractedParams = initialcombinations.map(combination => {
      return {
          Query: combination.Query,
          UniqueID: combination.UniqueID,
          LoadTime : combination.LoadTime
      };
  });

    const callApiInBatches = async () => {
      const batchSize = 5;
      const numBatches = Math.ceil(initialcombinations.length / batchSize);

      for (let i = 0; i < numBatches; i++) {
        const startIdx = i * batchSize;
        const endIdx = Math.min(
          startIdx + batchSize,
          initialcombinations.length
        );
        const batchParams = extractedParams.slice(startIdx, endIdx);

        try {
          const response = await fetch("http://127.0.0.1:3002/firequery", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: batchParams,
              connection_string: combinations.connectionString,
              threshold_time: 5,
            }),
          });

          if (!response.ok) {
            throw new Error("API call failed");
          }

          const data = await response.json();
          // console.log(data);
          updateArray(JSON.parse(data).result)
        } catch (error) {
          console.error("Error calling API:", error);
        }
      }
    };

    callApiInBatches();
  }, []); 


const columns = useMemo(
    () => [
      {
        accessorKey: 'Measure',
        header: 'Measure',
      },
      {
        accessorKey: 'DimensionName',
        header: 'Dimension Name',
      },
      {
        accessorKey: 'ColumnName',
        header: 'Column Name',
      },
      {
        accessorKey: 'LoadTime',
        header: 'Load Time',
      },
      {
        accessorKey: 'ReportName',
        header: 'Report Name',
      },
      {
        accessorKey: 'PageName',
        header: 'Page Name',
      },
      {
        accessorKey: 'VisualName',
        header: 'Visual Name',
      },
      {
        accessorKey: 'VisualTitle',
        header: 'Visual Title',
      },
    ],
    [],
  );

  const [rowSelection, setRowSelection] = useState({});


  
  const table = useMaterialReactTable({
    columns,
    data : initialcombinations,
    enableRowSelection: true,
    getRowId:(row) => row.UniqueID,
    state: { rowSelection }, 
    // enablePagination: false,

  });

  // useEffect(() => {
  //   console.info({ rowSelection }); 
  // }, [rowSelection]);

  return <MaterialReactTable table={table} />;
};

export default Example;
