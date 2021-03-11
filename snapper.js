// Cribbed from
// https://github.com/mdn/samples-server/blob/master/s/webrtc-capturestill/capture.js

// TODO: make this do the right thing on mobile screen.
var width = 640; // We will scale the photo width to this

function stopStream(stream) {
  stream.getTracks().forEach((track) => track.stop());
}

// If we haven't populated dropdown box yet, queries media devices, filters out
// only video inputs and populates the dropdown box.
async function maybeListCameras(currentDeviceId) {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const select = document.getElementById("selectCamera");

  // See if we already have done it.
  if (select.length !== 1 || select.options[0].text !== "...") {
    return;
  }

  // Clear out existing options.
  select.length = 0;
  devices.forEach((device) => {
    if (device.kind !== "videoinput") {
      return;
    }
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.text = device.label || device.deviceId;
    if (device.deviceId === currentDeviceId) {
      option.selected = true;
    }
    select.add(option);
  });
}

//
async function openCamera(deviceId = null) {
  let videoConstraints;
  if (!deviceId) {
    // If there is a previous id in local storage, use that.
    deviceId = window.localStorage.getItem("defaultDeviceId");
  }
  if (deviceId) {
    videoConstraints = {
      deviceId,
    };
  } else {
    videoConstraints = {
      // prefer back-facing camera if one exists
      facingMode: "environment",
    };
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: videoConstraints,
    audio: false,
  });

  const video = document.getElementById("video");
  if (video.srcObject) {
    stopStream(video.srcObject);
  }

  // Get the device id of the stream. There should be only one track.
  const currentDeviceId = stream.getTracks()[0].getSettings().deviceId;

  // Store the device id in local storage so we can default to it later.
  window.localStorage.setItem("defaultDeviceId", currentDeviceId);

  video.srcObject = stream;
  video.play();

  // Fire off device listing once we start getting video. We want to do it here
  // since the user has now allowed access to the camera.
  await maybeListCameras(currentDeviceId);
}

function startup() {
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const startButton = document.getElementById("startButton");

  let streaming = false;
  video.addEventListener(
    "canplay",
    () => {
      if (!streaming) {
        let height = video.videoHeight / (video.videoWidth / width);

        // Firefox currently has a bug where the height can't be read from
        // the video, so we will make assumptions if this happens.

        if (isNaN(height)) {
          height = width / (4 / 3);
        }

        video.setAttribute("width", width);
        video.setAttribute("height", height);
        canvas.setAttribute("width", width);
        canvas.setAttribute("height", height);
        streaming = true;
      }
    },
    false
  );

  startButton.addEventListener(
    "click",
    function (ev) {
      takePicture();
      ev.preventDefault();
    },
    false
  );

  const selectCamera = document.getElementById("selectCamera");
  selectCamera.addEventListener("input", (ev) => {
    const select = ev.target;
    const deviceId = select.options[select.selectedIndex].value;
    openCamera(deviceId);
  });

  clearPhoto();

  // TODO: remember which camera was last used and use it again.
  openCamera();
}

function clearPhoto() {
  const photo = document.getElementById("photo");
  const canvas = document.getElementById("canvas");

  const context = canvas.getContext("2d");
  context.fillStyle = "#AAA";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const data = canvas.toDataURL("image/png");
  photo.setAttribute("src", data);
}

// Capture a photo by fetching the current contents of the video
// and drawing it into a canvas, then converting that to a PNG
// format data URL. By drawing it on an offscreen canvas and then
// drawing that to the screen, we can change its size and/or apply
// other changes before drawing it.
function takePicture() {
  const photo = document.getElementById("photo");
  const canvas = document.getElementById("canvas");
  const video = document.getElementById("video");
  const context = canvas.getContext("2d");
  if (canvas.height) {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const data = canvas.toDataURL("image/png");
    photo.setAttribute("src", data);
  } else {
    clearPhoto();
  }
}

// Set up our event listener to run the startup process
// once loading is complete.
window.addEventListener("load", startup, false);
