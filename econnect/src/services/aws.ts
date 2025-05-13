import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid' ;
import { firestore } from './firebase';
import { doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

// AWS Configuration
AWS.config.update({
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
});

const s3 = new AWS.S3();
const bucketName = process.env.REACT_APP_AWS_S3_BUCKET_NAME || 'econnect-recordings';

// Upload recording to S3
const uploadRecording = async (
  file: File,
  userId: string,
  eventId: string,
  meetingId: string
): Promise<string> => {
  try {
    const fileExtension = file.name.split('.').pop();
    const fileName = `recordings/${userId}/${eventId}/${meetingId}/${uuidv4()}.${fileExtension}`;

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: file,
      ContentType: file.type,
      ACL: 'private',
    };

    const uploadResult = await s3.upload(params).promise();
    return uploadResult.Location;
  } catch (error) {
    console.error('Error uploading recording to S3:', error);
    throw error;
  }
};

// Save recording metadata to Firestore
const saveRecordingMetadata = async (
  userId: string,
  eventId: string,
  meetingId: string,
  url: string,
  duration: number,
  title: string
) => {
  try {
    const recordingData = {
      userId,
      eventId,
      meetingId,
      url,
      duration,
      title,
      startTime: new Date(),
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(firestore, 'recordings'), recordingData);
  } catch (error) {
    console.error('Error saving recording metadata:', error);
    throw error;
  }
};

// Get pre-signed URL for downloading a recording
const getRecordingDownloadUrl = async (key: string): Promise<string> => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: 3600, // URL expires in 1 hour
    };

    return s3.getSignedUrlPromise('getObject', params);
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    throw error;
  }
};

// Delete recording from S3
const deleteRecording = async (key: string): Promise<void> => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key,
    };

    await s3.deleteObject(params).promise();
  } catch (error) {
    console.error('Error deleting recording from S3:', error);
    throw error;
  }
};

// List recordings for a user
const listUserRecordings = async (userId: string, prefix: string = ''): Promise<AWS.S3.ObjectList> => {
  try {
    const params = {
      Bucket: bucketName,
      Prefix: `recordings/${userId}/${prefix}`,
    };

    const listResult = await s3.listObjectsV2(params).promise();
    return listResult.Contents || [];
  } catch (error) {
    console.error('Error listing user recordings:', error);
    throw error;
  }
};

export {
  uploadRecording,
  saveRecordingMetadata,
  getRecordingDownloadUrl,
  deleteRecording,
  listUserRecordings,
};
