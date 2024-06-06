import React, { useState } from "react";
import "./App.css";
import backgroundSVG from "./assets/Background/Homepage.svg";
import InputComponent from "./Components/InputComponent";
import TableComponent from "./Components/TableComponent";
import { IoRemoveOutline } from "react-icons/io5";
import InputDisplayComponent from "./Components/Testing";

const MainComponent = () => {
  const [combinations, setCombinations] = useState({});
  localStorage.setItem("combinations", JSON.stringify(combinations));
  const [inputs, setInputs] = useState({
    // filePath: [],
    modelName: "",
    xmlaEndpoint: "",
    thresholdValue: "",
    runningForFirstTime: 0,
  });

  const [filePath, setFilePath] = useState()
  const [filePathArray, setFilePathArray] = useState([])


  // console.log(combinations)

  return (
    <>
      {combinations.results ? (
        <TableComponent filePathArray = {filePathArray} combinations={combinations} modelName = {inputs.modelName} thresholdValue = {inputs.thresholdValue} inputs={inputs}/>
      ) : (
        <InputComponent filePathArray = {filePathArray} setFilePathArray = {setFilePathArray} filePath = {filePath} setFilePath = {setFilePath} setCombinations={setCombinations} inputs={inputs} setInputs={setInputs} />
      )}
      {/* <InputDisplayComponent/> */}
     
    </>
  );
};

export default MainComponent;
