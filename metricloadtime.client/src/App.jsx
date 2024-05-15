import React, { useState } from "react";
import "./App.css";
import backgroundSVG from "./assets/Background/Homepage.svg";
import InputComponent from "./Components/InputComponent";
import TableComponent from "./Components/TableComponent";
import { IoRemoveOutline } from "react-icons/io5";


const App = () => {
  const [combinations, setCombinations] = useState({});
  localStorage.setItem("combinations", JSON.stringify(combinations));
  const [inputs, setInputs] = useState({
    filePath: "",
    modelName: "",
    xmlaEndpoint: "",
    thresholdValue: "",
    runningForFirstTime: 0,
  });

  // console.log(combinations)

  return (
    <>
      <nav className="navbar bg-body-tertiary">
        <div className="container-fluid mx-5">
          <a className="navbar-brand mx-5">Metric Load Time Tool</a>
        </div>
      </nav>

      {combinations.results ? (
        <TableComponent combinations={combinations} modelName = {inputs.modelName} thresholdValue = {inputs.thresholdValue} />
      ) : (
        <InputComponent setCombinations={setCombinations} inputs={inputs} setInputs={setInputs} />
      )}
      
     
    </>
  );
};

export default App;
