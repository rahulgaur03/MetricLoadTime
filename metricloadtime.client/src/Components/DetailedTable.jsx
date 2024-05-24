import { FaClock } from "react-icons/fa";
import {
  Box,
} from '@mui/material';


import React, { useEffect, useMemo, useState } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import axios from "axios";

import CircularProgress from '@mui/material/CircularProgress';


const Example = ({combinations,initialcombinations,setinitialcombinations,genereatedLoadTimes,setGenereatedLoadTimes,rowSelection,setRowSelection, thresholdValue, filteredData, setFilteredData}) => {

  // console.log(initialcombinations)

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
              generateCombinationsResponse.clone().json().then(results => setinitialcombinations(results));
              setFilteredData(initialcombinations)
              console.log(initialcombinations)
              clearInterval(intervalId); // Stop polling if generateCombinationsPromise is resolved
            } else {
              clearInterval(intervalId); // Stop polling if generateCombinationsPromise fails
            }
          }
      }
    } catch (error) {
      console.error(error);
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
        // accessorFn: (originalRow) => (originalRow.loadTime > thresholdValue ? 'true' : 'false'), //must be strings
        // filterVariant: 'checkbox',
        Cell: ({ cell }) => ( 
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {cell.getValue() == 'x' ? <CircularProgress className="loadtimeprogress" /> : <span>{cell.getValue()}</span>  }
          
          </Box>
        ),
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



  // console.log(rowSelection)


  
  const table = useMaterialReactTable({
    columns,
    data : filteredData,
    enableRowSelection: true,
    enableStickyHeader: true,
    enableColumnOrdering: true,
    getRowId:(row) => row.uniqueID,
    state: { rowSelection }, 
    onRowSelectionChange: setRowSelection,
    initialState: { density: 'compact', showGlobalFilter: true},
    positionGlobalFilter :"right",
    muiSearchTextFieldProps :{
        placeholder: `Search ${filteredData.length} rows`,
        sx: { minWidth: '300px' },
        variant: 'outlined',
      }
  });

  return(
    <div>

    <MaterialReactTable table={table} />;
  </div>
  )
};

export default Example;
