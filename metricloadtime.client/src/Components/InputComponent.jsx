import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
// import Button from 'react-bootstrap/Button'; 
import axios from 'axios';

import Modal from 'react-bootstrap/Modal';

const InputComponent = ({ setCombinations }) => {

  


  const [model, setModel] = useState('powerbi');

  const [progress, setProgress] = useState({Total: 100, Progress: 0});
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [progresspopoverVisible, setprogressPopoverVisible] = useState(false);

  // const [combinations, setcombinations] = useState({})



  const [inputs, setInputs] = useState({
    filePath: '',
    modelName: '',
    xmlaEndpoint: '',
    thresholdValue: '',
    runningForFirstTime: 0,
  });


  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")


  const handleemail = (e) =>{
    setEmail(e.target.value)
  }
  const handlepassword = (e) =>{
    setPassword(e.target.value)
  }

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    const inputValue = type === 'checkbox' ? 1 : value;
    setInputs({
      ...inputs,
      [name]: inputValue,
    });
  };

  const handleModelClick = (modelType) => {
    setModel(modelType);
    setInputs({
      ...inputs,
      modelName: '',
      xmlaEndpoint: '', // Reset these inputs when switching models
    });
  };

  const handleResetClick = () => {
    setInputs({
      ...inputs,
      filePath: '',
      modelName: '',
      xmlaEndpoint: '',
      thresholdValue: '',
      runningForFirstTime: false,
    });
  };

  const analyze = async () => {
    let generateCombinationsPromise; // Define generateCombinationsPromise outside the try block
    try {
      const requestBody = {
        FilePath: inputs.filePath,
        ModelName: inputs.modelName,
        EndPoint: inputs.xmlaEndpoint,
        ThresholdValue: parseInt(inputs.thresholdValue),
        RunningFirstTime: parseInt(inputs.runningForFirstTime),
      };

      // Call /generatecombinations API without waiting for its response
      // generateCombinationsPromise = fetch('http://127.0.0.1:3002/generatecombinations', {
      generateCombinationsPromise = fetch('api/adomd/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });


      const generateCombinationsResponse = await generateCombinationsPromise;
      if (generateCombinationsResponse.ok) {
          generateCombinationsResponse.clone().json().then(result => console.log(JSON.parse(result)));
      }

      // Show popover
      setPopoverVisible(true);
    } catch (error) {
      console.error(error);
      // Handle error
    }

  }



    const login = async () => {
      let generateCombinationsPromise; // Define generateCombinationsPromise outside the try block
      try {
        const requestBody = {
          Username: String(email),
          Password: String(password),
        };


        console.log(requestBody)
  
        // Call /generatecombinations API without waiting for its response
        // generateCombinationsPromise = fetch('http://127.0.0.1:3002/generatecombinations', {
        generateCombinationsPromise = fetch('api/adomd/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });


      //   generateCombinationsPromise = axios.post('api/adomd/progress', requestBody, {
      //   headers: {
      //     "Accept": "*/*",
      //     "User-Agent": "Thunder Client (https://www.thunderclient.com)",
      //     "Content-Type": "application/json" 
      //   }
      // });
       


  
        // Show popover
        setprogressPopoverVisible(true);
        setPopoverVisible(false)
      } catch (error) {
        console.error(error);
        // Handle error
      }




    // Call /getprogress API immediately after sending the request to /generatecombinations
    const intervalId = setInterval(async () => {
      try {
        const progressResponse = await fetch('api/adomd/progressBar');
        if (!progressResponse.ok) {
          clearInterval(intervalId);
          throw new Error('Failed to get progress');
        }
        const progressData = await progressResponse.json();
        console.log(progressData);
        setProgress(progressData);

        if (generateCombinationsPromise) {
          const generateCombinationsResponse = await generateCombinationsPromise;
          if (generateCombinationsResponse.ok) {
            generateCombinationsResponse.clone().json().then(result => setCombinations(JSON.parse(result)));
            setPopoverVisible(false)
            setprogressPopoverVisible(false);
            clearInterval(intervalId); // Stop polling if generateCombinationsPromise is resolved
          } else {
            clearInterval(intervalId); // Stop polling if generateCombinationsPromise fails
          }
        }
      } catch (error) {
        console.error(error);
        // Handle error
      }
    }, 2000); // Adjust polling interval as needed
  };


//   return (

// export default InputComponent;


// import React from 'react'

// const InputComponent = () => {
  return (
    <>

    <div className="container mt-5 border">
      <div className="innercontainer container mt-4 mx-3 mb-5" style={{ width: '90%' }}>
        <div className="tabs border-bottom d-flex">
          <div className="powerbimodel">
            <button type="button" className={model === 'powerbi' ? 'btn btn-danger' : 'btn'} onClick={() => handleModelClick('powerbi')}>
              Power BI Model
            </button>
          </div>
          <div className="tabularmodel mx-1">
            <button type="button" className={model === 'tabular' ? 'btn btn-danger' : 'btn'} onClick={() => handleModelClick('tabular')}>
              Tabular Model
            </button>
          </div>
        </div>
      </div>

      <div className="inputs container mx-5 mr-3" style={{ width: '85%' }}>
        <div className="filepathinput d-flex flex-column">
          <label className="filepath fs-5 fw-bold mt-2">File Path</label>
          <input
            type="text"
            name="filePath"
            className="mt-2"
            style={{ height: '40px' }}
            value={inputs.filePath}
            onChange={handleInputChange}
            placeholder="Enter File Path"
          />
        </div>

        {model === 'tabular' && (
          <>
            <div className="modelnameinput d-flex flex-column mt-2">
              <label className="modelname fs-5 fw-bold mt-2">Database Name</label>
              <input
                type="text"
                name="modelName"
                className="mt-2"
                style={{ height: '40px' }}
                value={inputs.modelName}
                onChange={handleInputChange}
                placeholder="Enter Database Name"
              />
            </div>
            <div className="xmlaendpointinput d-flex flex-column mt-2">
              <label className="xmlaendpoint fs-5 fw-bold mt-2">Server Name</label>
              <input
                type="text"
                name="xmlaEndpoint"
                className="mt-2"
                style={{ height: '40px' }}
                value={inputs.xmlaEndpoint}
                onChange={handleInputChange}
                placeholder="Enter Server Name"
              />
            </div>
          </>
        )}

        {model !== 'tabular' && (
          <>
            <div className="modelnameinput d-flex flex-column mt-2">
              <label className="modelname fs-5 fw-bold mt-2">Model Name</label>
              <input
                type="text"
                name="modelName"
                className="mt-2"
                style={{ height: '40px' }}
                value={inputs.modelName}
                onChange={handleInputChange}
                placeholder="Enter Model Name"
              />
            </div>
            <div className="xmlaendpointinput d-flex flex-column mt-2">
              <label className="xmlaendpoint fs-5 fw-bold mt-2">XMLA Endpoint</label>
              <input
                type="text"
                name="xmlaEndpoint"
                className="mt-2"
                style={{ height: '40px' }}
                value={inputs.xmlaEndpoint}
                onChange={handleInputChange}
                placeholder="Enter XMLA Endpoint"
              />
            </div>
          </>
        )}

        <div className="thresholdvalueinput d-flex flex-column mt-2">
          <label className="thresholdvalue fs-5 fw-bold mt-2">Threshold Value</label>
          <input
            type="text"
            name="thresholdValue"
            className="mt-2"
            style={{ height: '40px' }}
            value={inputs.thresholdValue}
            onChange={handleInputChange}
            placeholder="Enter Threshold Value"
          />
        </div>

        <div className="runningforfirsttimeinput d-flex mt-2">
          <label className="runningforfirsttime fs-5 fw-bold mt-2">Running for First Time</label>
          <input
            type="checkbox"
            name="runningForFirstTime"
            className="mt-3 mx-2"
            checked={inputs.runningForFirstTime}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="innercontainer container mt-4 mx-3 mb-5" style={{ width: '90%' }}>
        <div className="tabs d-flex justify-content-end">
          <div className="powerbimodel">
            <button type="button" className="btn btn-danger" onClick={() => handleResetClick()}>
              Reset
            </button>
          </div>
          <div className="tabularmodel mx-1">
            <button type="button" className="btn btn-danger" onClick={() => analyze()}>
              Analyze
            </button>
            {/* {popoverVisible ? ( */}
            {/* <div className="modal fade" id="staticBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
              <div className="modal-dialog">
                <div className="modal-content">
                  {/* <div className="modal-header">
                    <h1 className="modal-title fs-5" id="staticBackdropLabel">Modal title</h1>
                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div> */}
            {/* <div className="modal-body">
                    <div className="progress" role="progressbar" aria-label="Basic example" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">
                      <div className="progress-bar" style={{width: progress.progress + "%"}}></div>
                    </div>
                    {progress.result}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" className="btn btn-primary">Understood</button>
                  </div>
                </div>
              </div>
            </div> */}
            <Modal
              show={progresspopoverVisible}
              onHide={() => setprogressPopoverVisible(false)}
              backdrop="static"
              keyboard={false}
            >
              <Modal.Header closeButton>
                <Modal.Title>Please Wait while we analyze data</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <div className="modal-body">
                  <div className="progress" role="progressbar" aria-label="Basic example" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">
                    <div className="progress-bar" style={{ width: progress.progress + "%" }}></div>
                  </div>
                  {progress.Progress}/{progress.Total}
                </div>
              </Modal.Body>
              <Modal.Footer>
              {/* <Button variant="primary" onClick={handleClose}>
                  Close
                </Button> */}
              </Modal.Footer> 
            </Modal>




            <Modal
              show={popoverVisible}
              onHide={() => setPopoverVisible(false)}
              backdrop="static"
              keyboard={false}
            >
              <Modal.Header closeButton>
                <Modal.Title>Login</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <div className="modal-body">
                  <div class="mb-3">
                    <label for="exampleInputEmail1" class="form-label">Email Address</label>
                    <input type="email" class="form-control" id="exampleInputEmail1" aria-describedby="emailHelp" onChange={handleemail} />
                      <div id="emailHelp" class="form-text">We'll never share your email with anyone else.</div>
                  </div>
                  <div class="mb-3">
                    <label for="exampleInputPassword1" class="form-label">Password</label>
                    <input type="password" class="form-control" id="exampleInputPassword1" onChange={handlepassword} />
                  </div>
                  <button type="submit" class="btn btn-primary" onClick={login} >Submit</button>
                  </div>
              </Modal.Body>
              <Modal.Footer>
              {/* <Button variant="primary" onClick={handleClose}>
                  Close
                </Button> */}
              </Modal.Footer> 
            </Modal>




              {/* 
              
              <form>
                
              </form>
              
              */}

          </div>
        </div>
      </div>
    </div>
  </>
)
}

export default InputComponent
