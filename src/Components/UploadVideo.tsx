import React, { useState } from "react";
// Define a type for the file state
// interface FileWithPreview extends File {
//   data: ArrayBuffer;
//   preview: string;
// }

interface ApiParams {
  inputText: string;
}

const UploadVideo: React.FC = () => {
  const [textValue, setTextValue] = useState<string>("");
  const [file, setFileValue] = useState<File | null>(null);

  // get the uploadId

  const startMultipartUpload = async (fileName: string) => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/user/upload/upload-start?fileName=${fileName}`,
        {
          method: "post",
        }
      );
      if (response) {
        return response.json();
      }
    } catch (err) {
      console.log(err);
    }
  };

  // get the resigned url to upload the parts
  const getPreSignedUrl = async (
    fileName: string,
    uploadId: any,
    partNumber: any
  ) => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/user/upload/getpresignedUrl?fileName=${fileName}&uploadId=${uploadId}&partNumber=${partNumber}`,
        {
          method: "get",
        }
      );
      if (response) {
        return response.json();
      }
    } catch (err) {
      console.log(err);
    }
  };

  // upload part to s3 using preSignedUrl

  const uploadPart = async (
    getPreSignedUrl: any,
    partNumber: any,
    partData: any
  ) => {
    try {
      const response = await fetch(getPreSignedUrl, {
        method: "put",
        body: partData,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload part :${partNumber}`);
      }

      return response.headers.get("ETag");
    } catch (err) {
      console.log(err);
    }
  };

  // complete multipart upload
  const completeMultiPartUpload = async (
    fileName: any,
    uploadId: any,
    parts: any
  ) => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/user/upload/uploadcomplete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName,
            uploadId,
            parts,
          }),
        }
      );

      if (response) {
        return response.json();
      }
    } catch (err) {
      console.log(err);
    }
  };

  // Upload videos function
  const uploadFile = async (file: any) => {
    const fileName = file.name;

    const uploadId: any = await startMultipartUpload(fileName);
    const uID = uploadId.uploadId;

    const partSize = 5 * 1024 * 1024;

    let partNumber = 0;

    const uploadPromises = [];

    for (let start = 0; start < file.size; start += partSize) {
      partNumber++;
      const part = partNumber;

      const partData = file.slice(start, start + partSize);
      uploadPromises.push(
        getPreSignedUrl(fileName, uID, part)
          .then(({ url }: any) => uploadPart(url, part, partData))
          .then((ETag) => ({ ETag, PartNumber: part }))
      );
    }

    const parts = await Promise.all(uploadPromises);

    const sortPromises = parts.sort((a, b) => a.PartNumber - b.PartNumber);

    const completeUploadConfirmation = await completeMultiPartUpload(
      fileName,
      uID,
      sortPromises
    );

    console.log("Upload Completed !!", completeUploadConfirmation);
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTextValue(event.target.value);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFiles = event.target.files[0];
      setFileValue(selectedFiles);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (file) {
      // API Parameters
      const apiParams: ApiParams = {
        inputText: textValue,
      };
      console.log(file);
      //await apiCall(apiParams);
      await uploadFile(file);
    } else {
      console.error("File not selected");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Text Input:
        <input type="text" value={textValue} onChange={handleTextChange} />
      </label>
      <br />
      <label>
        Video Upload:
        <input type="file" onChange={handleFileChange} />
      </label>
      <br />
      <button type="submit">Submit</button>
      <br />
      <br />
      {/* {file && (
        <div>
          <p>Preview:</p>
          <video src={file.preview} controls width="400" />
        </div>
      )} */}
    </form>
  );
};

export default UploadVideo;
