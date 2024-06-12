import React, { useEffect, useState } from "react";
// import DetailedTable from './DetailedTable';
import Example from "./DetailedTable";
import "./TableComponent.css";
import { CgExport } from "react-icons/cg";
import { TfiReload } from "react-icons/tfi";
import { mkConfig, generateCsv, download } from "export-to-csv"; //or use your library of choice here
import { IoRemoveOutline } from "react-icons/io5";
import { Popover, Typography } from '@mui/material'
import { IoFilterSharp } from "react-icons/io5";

import Button from '@mui/material/Button';
import axios from "axios";
import MainComponent from "../MainComponent";
import { useStaticPicker } from "@mui/x-date-pickers/internals";

const TableComponent = ({ filePathArray, combinations, modelName, thresholdValue, inputs }) => {
  const [view, setView] = useState("detail");
  const [backtoinputpage, setbacktoinputpage] = useState(false)
  const [genereatedloadTimes, setGenereatedloadTimes] = useState(0);
  const [initialcombinations, setinitialcombinations] = useState(
    combinations.results
  );
  const [rowSelection, setRowSelection] = useState({});

  const [filteredData, setFilteredData] = useState(initialcombinations)

  const [filterdimensionCheckboxFlag, setFilterdimensionCheckboxFlag] =
    useState(false)
  const [anchorEl, setAnchorEl] = useState(null)

  const [
    filterthresholdCheckboxFlag,
    setFilterthresholdCheckboxFlag
  ] = useState(false)


  const [filtervisualCheckboxFlag, setFiltervisualCheckboxFlag] =
    useState(false)


  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;



  const baseFileNames = filePathArray.map(value =>
    value.replace(/^.*[\\/]/, '').replace(/\..*$/, '')
  ).join(', ');

  const csvConfig = mkConfig({
    fieldSeparator: ",",
    decimalSeparator: ".",
    useKeysAsHeaders: true,
    filename: modelName.concat(" Result"),
  });


  const handleExportData = () => {
    // console.log(initialcombinations)
    let copiedArray = initialcombinations.map(item => {
      // Create a shallow copy of the object
      const newItem = { ...item };
      // Delete the 'queries' key
      delete newItem.query;
      return newItem;
    });
    const csv = generateCsv(csvConfig)(copiedArray);
    download(csvConfig)(csv);
  };

  const updateArray = (arrayB) => {
    setinitialcombinations((prevArrayA) => {
      return prevArrayA.map((aItem, index) => {
        const bItem = arrayB.find((item) => item.uniqueID === aItem.uniqueID);
        if (bItem && aItem.loadTime !== bItem.loadTime) {
          return {
            ...aItem,
            loadTime: bItem.loadTime,
            previousLoadTime: bItem.previousLoadTime,
          };
        } else {
          return aItem;
        }
      });
    });
  };


  const handleReload = () => {
    const fetchData = async () => {

      const updatedA = {};
      initialcombinations.forEach(item => {
        if (rowSelection[item.uniqueID]) {
          const stringId = item.uniqueID.toString(); // Convert ID to string
          updatedA[stringId] = item.query;
        }
      });
      setRowSelection(updatedA);
      try {


        let headersList = {
          "Content-Type": "application/json"
        }

        let bodyContent = JSON.stringify({
          "ReloadQuries": updatedA
        });
        console.log(bodyContent)
        let reqOptions = {
          url: "http://localhost:8001/api/adomd/reload",
          method: "POST",
          headers: headersList,
          data: bodyContent,
        }

        let response = await axios.request(reqOptions);

        if (response.data === 1) {

          let generateCombinationsPromise


          generateCombinationsPromise = fetch('api/adomd/getloadtime', {
            method: 'GET',
          });



          if (generateCombinationsPromise) {
            const generateCombinationsResponse = await generateCombinationsPromise;
            if (generateCombinationsResponse.ok) {
              // console.log(generateCombinationsResponse.json())
              generateCombinationsResponse.clone().json().then(results => setinitialcombinations(results));
              setFilteredData(initialcombinations)
            }
          }
        }
        setTimeout(() => {
          setRowSelection({});
        }, 2000);
      } catch (error) {
        console.error(
          `Failed to fetch query for ID : ${error.message}`
        );
      }
    }

    fetchData();
  };


  const handlethresholdCheckboxChange = event => {
    setFilterthresholdCheckboxFlag(event.target.checked)

    // setFilteredData(
    //   filteredData.filter(item => {
    //     return !filterthresholdCheckboxFlag ? item.loadTime === (inputs.thresholdValue) : true
    //   })
    // )
  }

  const handledimensionCheckboxChange = event => {
    setFilterdimensionCheckboxFlag(event.target.checked)
    // setFilteredData(
    //   filteredData.filter(item => {
    //     return !filterdimensionCheckboxFlag ? item.hasDimension === '1' : true
    //   })
    // )
  }



  const handlevisualCheckboxChange = event => {
    setFiltervisualCheckboxFlag(event.target.checked)
    // setFilteredData(
    //   filteredData.filter(item => {
    //     return !filtervisualCheckboxFlag ? item.visualName !== '-' : true
    //   })
    // )
  }


  useEffect(() => {
    const filterConditions = [
      filterthresholdCheckboxFlag ? item => item.loadTime === inputs.thresholdValue : null,
      filterdimensionCheckboxFlag ? item => item.hasDimension === '1' : null,
      filtervisualCheckboxFlag ? item => item.visualName !== '-' : null
    ].filter(Boolean); // Removes null conditions

    const filteredData = filterConditions.length
      ? initialcombinations.filter(item => filterConditions.every(condition => condition(item)))
      : initialcombinations;

    setFilteredData(filteredData);
  }, [
    filterthresholdCheckboxFlag,
    filterdimensionCheckboxFlag,
    filtervisualCheckboxFlag,
  ]);


  const [flag, setFlag] = useState(0)



  useEffect(() => {
    const countX = initialcombinations.filter(
      (obj) => obj.loadTime != "x"
    ).length;
    setGenereatedloadTimes(countX);
    setFlag(1)
    
  }, [initialcombinations]);

  console.log(combinations);




  const handlebackbutton = async () => {
    let headersList = {
      "Content-Type": "application/json"
     }
     
   
     let response = await fetch("http://localhost:8001/api/adomd/rerun", { 
       method: "GET",
       headers: headersList
     });
     
     let data = await response.text();
     console.log(data);
     setbacktoinputpage(true)

  }

  if (backtoinputpage) {
    
    return (
      <>
        <MainComponent />
      </>
    )
  }
  else {

    return (
      <>
        <nav className="navbar bg-body-tertiary">
          <div className="container-fluid mx-5">
            <a className="navbar-brand mx-5">Metric Load Time Tool</a>
          </div>
        </nav>

        <button className="btn inputselectedbutton"
          onClick={handlebackbutton}>&lt; Back to Input Page</button>
        <div className="container mt-5 border">
          <div
            className="tabcontainer container mt-4 mx-3 mb-5 d-flex justify-content-between border-bottom"
            style={{ width: "90%" }}
          >
            <div className="tabs d-flex">
              <div className="summarymodel mx-1">
                <button
                  type="button"
                  className={
                    view === "summary"
                      ? "btn inputselectedbutton"
                      : "btn inputunselectedbutton"
                  }
                  onClick={() => setView("summary")}
                >
                  Summary
                </button>
              </div>
              <div className="detailmodel">
                <button
                  type="button"
                  className={
                    view === "detail"
                      ? "btn inputselectedbutton"
                      : "btn inputunselectedbutton"
                  }
                  onClick={() => setView("detail")}
                >
                  Details
                </button>
              </div>
            </div>
            {genereatedloadTimes != initialcombinations.length ? (
              <div>
                <b>
                  <span style={{ color: "#A31619" }}>
                    {genereatedloadTimes}/{initialcombinations.length}
                  </span>{" "}
                  Combinations Loaded
                </b>
              </div>
            ) : (
              ""
            )}
            {
              view === "detail" ? (
                <div className="d-flex">
                  <Button aria-describedby={id} variant="outlined" onClick={handleClick} className=" exportbtn" style={{ backgroundColor: "#f0f0f0", border: "none" }} >
                    <IoFilterSharp />
                  </Button>
                  <Popover
                    id={id}
                    open={open}
                    anchorEl={anchorEl}
                    onClose={handleClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'left',
                    }}
                  >
                    <Typography sx={{ p: 2 }} className="d-flex flex-column">
                      <label>
                        <input
                          type="checkbox"
                          checked={filterthresholdCheckboxFlag}
                          onChange={handlethresholdCheckboxChange}
                          className='mx-2'
                        />
                        Combinations Above Threshold
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={filterdimensionCheckboxFlag}
                          onChange={handledimensionCheckboxChange}
                          className='mx-2'
                        />
                        Combinations With Dimensions
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={filtervisualCheckboxFlag}
                          onChange={handlevisualCheckboxChange}
                          className='mx-2'
                        />
                        Combinations With Visuals
                      </label></Typography>
                  </Popover>
                  <div className="export mx-1">
                    <button
                      type="button"
                      className="exportbtn"
                      onClick={handleExportData}
                    >
                      <b>
                        <CgExport className="mx-1 mb-1" />
                        Export
                      </b>
                    </button>
                  </div>
                  <div className="reload">
                    <button
                      type="button"
                      className="exportbtn"
                      onClick={handleReload}
                    >
                      <b>
                        <TfiReload className="mx-2 mb-1" />
                        Reload
                      </b>
                    </button>
                  </div>



                </div>
              ) : ""
            }
          </div>
          {view === "detail" ? (
            <div>

              {/* <Popover
              id={id}
              style={{ display: 'flex', flexDirection: 'row' }}
              open={open}
              anchorEl={anchorEl}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left'
              }}
            > */}
              {/* <div className='d-flex flex-column'>


              </div> */}
              {/* </Popover> */}

              <Example
                thresholdValue={inputs.thresholdValue}
                combinations={combinations}
                initialcombinations={initialcombinations}
                filteredData={filteredData}
                setFilteredData={setFilteredData}
                setinitialcombinations={setinitialcombinations}
                genereatedloadTimes={genereatedloadTimes}
                setGenereatedloadTimes={setGenereatedloadTimes}
                rowSelection={rowSelection}
                setRowSelection={setRowSelection}
              />
            </div>
          ) : (
            <div>
              <div className="usercardcontainer">
                <div className="cards justify-content-evenly">
                  <div className="carD ">
                    <div
                      className="card total_measures  rounded usercard"
                      style={{ width: "1000px" }}
                    >
                      <div className=" d-flex justify-content-between">
                        <div className="d-flex">
                          <IoRemoveOutline className="cardline" />
                          <h6 className="card-text">
                            <b>Model Name : </b>
                          </h6>
                        </div>
                        <h6 className="card-text">
                          <b>{inputs.modelName}</b>
                        </h6>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="cards justify-content-evenly">
                  <div className="carD ">
                    <div
                      className="card total_measures  rounded-0 usercard"
                      style={{ width: "1000px" }}
                    >
                      <div className=" d-flex justify-content-between">
                        <div className="d-flex">
                          <IoRemoveOutline className="cardline" />
                          <h6 className="card-text">
                            <b>Report Name : </b>
                          </h6>
                        </div>
                        <h6 className="card-text">
                          <b>{baseFileNames}</b>
                        </h6>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="cards justify-content-evenly">
                  <div className="carD">
                    <div
                      className="card total_measures  rounded-0 usercard "
                      style={{ width: "1000px" }}
                    >
                      <div className=" d-flex justify-content-between">
                        <div className="d-flex">
                          <IoRemoveOutline className="cardline" />
                          <h6 className="card-text">
                            <b>XMLA Endpoint : </b>
                          </h6>
                        </div>
                        <h6 className="card-text">
                          <b>{inputs.xmlaEndpoint}</b>
                        </h6>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="cards justify-content-evenly">
                  <div className="carD ">
                    <div
                      className="card total_measures  rounded-0 usercard"
                      style={{ width: "1000px" }}
                    >
                      <div className=" d-flex justify-content-between">
                        <div className="d-flex">
                          <IoRemoveOutline className="cardline" />
                          <h6 className="card-text">
                            <b>Threshold Value : </b>
                          </h6>
                        </div>
                        <h6 className="card-text">
                          <b>{thresholdValue}</b>
                        </h6>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="cards">
                <div className="carD px-5">
                  <div className="card total_measures  rounded-0 ">
                    <div className=" d-flex">
                      <IoRemoveOutline className="cardline" />

                      <h6 className="card-text">
                        <b>Total Measure Combination</b>
                      </h6>
                      <h5 className="card-title mb-auto">
                        {initialcombinations.length}
                      </h5>
                    </div>
                  </div>
                </div>

                <div className="carD px-5">
                  <div className="card total_measures  rounded-0 ">
                    <div className=" d-flex">
                      <IoRemoveOutline className="cardline" />

                      <h6 className="card-text">
                        <b>Combinations below threshold</b>
                      </h6>
                      <h5 className="card-title mb-auto">
                        {
                          initialcombinations
                            .map((entry) => entry.loadTime)
                            .filter((e) => e < thresholdValue).length
                        }
                      </h5>
                    </div>
                  </div>
                </div>
                <div className="carD px-5">
                  <div className="card total_measures  rounded-0 ">
                    <div className=" d-flex">
                      <IoRemoveOutline className="cardline" />

                      <h6 className="card-text">
                        <b>Combinations above threshold</b>
                      </h6>
                      <h5 className="card-title mb-auto">
                        {
                          initialcombinations
                            .map((entry) => entry.loadTime)
                            .filter((e) => e === thresholdValue).length
                        }
                      </h5>
                    </div>
                  </div>
                </div>
              </div>
              <div className="cards">
                <div className="carD px-5">
                  <div className="card total_measures  rounded-0 ">
                    <div className=" d-flex">
                      <IoRemoveOutline className="cardline" />

                      <h6 className="card-text">
                        <b>Combinations From Report</b>
                      </h6>
                      <h5 className="card-title mb-auto">
                        {
                          initialcombinations
                            .map((entry) => entry.reportName)
                            .filter((e) => e != "-").length
                        }
                      </h5>
                    </div>
                  </div>
                </div>

                <div className="carD px-5">
                  <div className="card total_measures  rounded-0 ">
                    <div className=" d-flex">
                      <IoRemoveOutline className="cardline" />

                      <h6 className="card-text">
                        <b>Combinations From Model</b>
                      </h6>
                      <h5 className="card-title mb-auto">
                        {
                          initialcombinations
                            .map((entry) => entry.reportName)
                            .filter((e) => e === "-").length
                        }
                      </h5>
                    </div>
                  </div>
                </div>
                <div className="carD px-5">
                  <div className="card total_measures  rounded-0 ">
                    <div className=" d-flex">
                      <IoRemoveOutline className="cardline" />

                      <h6 className="card-text">
                        <b>Combinations With Dimension</b>
                      </h6>
                      <h5 className="card-title mb-auto">
                        {
                          initialcombinations
                            .map((entry) => entry.reportName)
                            .filter((e) => e === "-").length
                        }
                      </h5>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
};

export default TableComponent;
