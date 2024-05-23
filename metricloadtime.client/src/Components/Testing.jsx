import React, { useState } from 'react';

function InputDisplayComponent() {
  const [filePath, setFilePath] = useState('');
  const [displayedfile, setDisplayedfile] = useState([]);
  const [filePathArray, setFilePathArray] = useState([])

  const handleFileInputChange = (e) => {
    setFilePath(e.target.value);

  };

  const handleFileAddButtonClick = () => {
    if (filePath.trim() !== '') {
        setDisplayedfile([...displayedfile, filePath]);
        setFilePath(''); 
        let filearray = filePathArray
        filearray.push(filePath)
        setFilePathArray(filearray)
    }
  };

  console.log(filePathArray)

  return (
    <div>
      <input
        type="text"
        value={filePath}
        onChange={handleFileInputChange}
        placeholder="Enter something..."
      />
      <button onClick={handleFileAddButtonClick}>Display</button>
      <div>
        <h3>Displayed Values:</h3>
        <ul>
          {displayedfile.map((value, index) => (
            <li key={index}>{value}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default InputDisplayComponent;
