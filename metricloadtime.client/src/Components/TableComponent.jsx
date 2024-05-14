import React, { useEffect, useState } from "react";
// import DetailedTable from './DetailedTable';
import Example from "./DetailedTable";
import "./TableComponent.css";
import { CgExport } from "react-icons/cg";
import { TfiReload } from "react-icons/tfi";
import { mkConfig, generateCsv, download } from "export-to-csv"; //or use your library of choice here

import axios from "axios";

const TableComponent = ({ combinations, modelName,thresholdValue }) => {
  const [view, setView] = useState("detail");
  const [genereatedloadTimes, setGenereatedloadTimes] = useState(0);
  const [initialcombinations, setinitialcombinations] = useState(
    combinations.results
  );
  const [rowSelection, setRowSelection] = useState({});

  // const columnHelper = createMRTColumnHelper();

  // const columns = [
  // columnHelper.accessor('id', {
  //     header: 'ID',
  //     size: 40,
  // }),
  // columnHelper.accessor('firstName', {
  //     header: 'First Name',
  //     size: 120,
  // }),
  // columnHelper.accessor('lastName', {
  //     header: 'Last Name',
  //     size: 120,
  // }),
  // columnHelper.accessor('company', {
  //     header: 'Company',
  //     size: 300,
  // }),
  // columnHelper.accessor('city', {
  //     header: 'City',
  // }),
  // columnHelper.accessor('country', {
  //     header: 'Country',
  //     size: 220,
  // }),
  // ];

  const csvConfig = mkConfig({
    fieldSeparator: ",",
    decimalSeparator: ".",
    useKeysAsHeaders: true,
    filename: modelName.concat(" Result"),
  });

  console.log(modelName);

  const handleExportData = () => {
    const csv = generateCsv(csvConfig)(initialcombinations);
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
            previousloadTime: bItem.previousloadTime,
          };
        } else {
          return aItem;
        }
      });
    });
  };

  const handleReload = () => {
    const fetchData = async () => {
      const fetchedQueries = [];
      for (const id in rowSelection) {
        const matchingCombination = initialcombinations.find(
          (c) => c.uniqueID.toString() === id
        );
        if (matchingCombination) {
          try {
            const response = await axios.post(
              "http://localhost:8001/api/adomd/reload",
              {
                uniqueID: id,
                Query: matchingCombination.query,
              }
            );
            // fetchedQueries.push({ uniqueID: row.uniqueID, query: response.data });
            console.log(response.data);
            updateArray(response.data);
            setTimeout(() => {
              setRowSelection({});
            }, 2000);
          } catch (error) {
            console.error(
              `Failed to fetch query for ID ${id}: ${error.message}`
            );
          }
        } else {
          console.warn(`No matching combination found for ID ${id}`);
        }
      }
    };

    fetchData();
  };

  useEffect(() => {
    const countX = initialcombinations.filter(
      (obj) => obj.loadTime != "x"
    ).length;
    setGenereatedloadTimes(countX);
  }, [initialcombinations]);

  console.log(combinations);

  return (
    <>
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
          <div className="d-flex">
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
        </div>
        {view === "detail" ? (
          <Example
            combinations={combinations}
            initialcombinations={initialcombinations}
            setinitialcombinations={setinitialcombinations}
            genereatedloadTimes={genereatedloadTimes}
            setGenereatedloadTimes={setGenereatedloadTimes}
            rowSelection={rowSelection}
            setRowSelection={setRowSelection}
          />
        ) : (
          <div>
            <div className="cards">
              <div className="carD px-5">
                <div className="card total_measures  rounded-0 ">
                  <div className="card-body">
                    <h4 className="card-text">
                      <b>Total Measure Combination</b>
                    </h4>
                    <h3 className="card-title mb-auto">
                      {initialcombinations.length}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="carD px-5">
                <div className="card combinations_below_threshold  rounded-0">
                  <div className="card-body">
                    <h4 className="card-text">
                      <b>Combinations below threshold</b>
                    </h4>
                    <h3 className="card-title mb-auto">
                      {
                        initialcombinations
                          .map((entry) => entry.loadTime)
                          .filter((e) => e < thresholdValue).length
                      }
                    </h3>
                  </div>
                </div>
              </div>
              <div className="carD px-5">
                <div className="card combinations_above_threshold  rounded-0">
                  <div className="card-body">
                    <h4 className="card-text">
                      <b>Combinations above threshold</b>
                    </h4>
                    <h3 className="card-title mb-auto">
                      {
                        initialcombinations
                          .map((entry) => entry.loadTime)
                          .filter((e) => e === thresholdValue).length
                      }
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TableComponent;
