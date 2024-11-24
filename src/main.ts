import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders'; // Ensure you have installed babylonjs-loaders for DDS support
import 'jomini';
import { Jomini } from 'jomini';
import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';
import {AdvancedDynamicTexture,TextBlock}  from 'babylonjs-gui'; // Import the GUI module

declare global {
  interface Window {
    bridgeData: (gamestate: string) => void;
  }
}

window.bridgeData = function(gamestate) {
  //loadSave(gamestate);
};

async function initializeSaveParser() {
  const saveParser = await Jomini.initialize();
  return saveParser;
}

let saveParser = await initializeSaveParser();

//drawSkyBox();


document.getElementById('fileInput')!.addEventListener('change', async (event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.readAsText(file, "windows1252");
    reader.onload = async (evt) => {
      try {
        const loadedMapName = file.name;
        const zipReader = new ZipReader(new BlobReader(file));
        const entries = await zipReader.getEntries();
        if (entries.length) {
          let text = '';
          if (entries[0]) {
            //@ts-ignore
            text = await entries[0].getData(new TextWriter());
          }
          console.log('Extracted Text:', text); // Log the extracted text for inspection

        

          // Check the length and a snippet of the content
          console.log('Extracted Text Length:', text.length);
          console.log('Extracted Text Snippet:', text.substring(0, 200));

          const parsedData = await saveParser.parseText(text, { encoding: "windows1252" }, (q) => q.json());
          const save = JSON.parse(parsedData);

          console.log("Parsed Data:", save);
          drawSystems(save.galactic_object);
         // drawHyperlanes(save.galactic_object);

          await zipReader.close();

          //save text as new file
          /*
          const blob = new Blob([text], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.click();
*/

        }
      } catch (error) {
        console.error("Error parsing file:", error);
      }
    };
  }
});

// Create the Babylon.js engine and scene
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

// Create a camera and light
const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2, Math.PI / 4, 10, BABYLON.Vector3.Zero(), scene);
camera.attachControl(canvas, true);
const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);

// Create a sphere
const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 5 }, scene);
sphere.position.y = 1; // Adjust the position to ensure it's above the ground

// Set the camera target to the sphere
camera.setTarget(sphere.position);

// Optionally, adjust the camera position to ensure the sphere is visible
camera.setPosition(new BABYLON.Vector3(0, 5, -10));

drawSkyBox();

// Show inspector
// scene.debugLayer.show();

console.log("Hello, BabylonJS!");

interface GalacticObject {
  star_class: string;
  coordinate: { x: number; y: number };
  hyperlane: { to: string }[];
  name: { key: string };
}

interface Country {
  flag: { colors: string[] };
}

interface Starbase {
  owner: number;
  system: string;
}

interface Output {
  galaxy_radius: number;
  galactic_object: { [key: string]: GalacticObject };
  country: { [key: string]: Country };
  starbases: Starbase[];
}

let output: Output | null = null;
let count = 0;
let countries = 0;
let countryColor = new BABYLON.Color3(1, 1, 1);
let bordersArray: any[][] = [];

camera.setPosition(new BABYLON.Vector3(0, 0, 450));


function drawSkyBox() {

  const url = 'https://playgrounds.babylonjs.xyz/wp7505888-purple-stars-wallpapers.jpg'
  const layer = new BABYLON.Layer('bg', url, scene, true);
  layer.isBackground = true;
  
}

function drawSystems(galacticObjects : any) {
  const spriteManager = new BABYLON.SpriteManager("spriteManager", "textures/center.dds", 2000, { width: 64, height: 64 }, scene);


  if (!galacticObjects) 
    return;


    const sprite = new BABYLON.Sprite("sprite", spriteManager);
    sprite.position = new BABYLON.Vector3(0, 0, 0);
    //sprite.size = output!.galaxy_radius;



  for (let gal in galacticObjects) {
    //instanciate a sphere for each gal
    const starClass = galacticObjects[gal].star_class;
    const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 5 }, scene);
    sphere.position = new BABYLON.Vector3(galacticObjects[gal].coordinate.x, galacticObjects[gal].coordinate.y, 0);

    sphere.material = new BABYLON.StandardMaterial("material", scene);

    (sphere.material as BABYLON.StandardMaterial).diffuseColor = new BABYLON.Color3(1, 1, 1);

    console.log(galacticObjects[gal].starbases[0])
    if(galacticObjects[gal].controller == 4294967295){
      (sphere.material as BABYLON.StandardMaterial).diffuseColor = new BABYLON.Color3(0, 0, 1);

    }
    sphere.material.alpha = 0.5;

    let nameColor = 'white'

    if(galacticObjects[gal].starbases[0] == 4294967295){
      nameColor = 'blue';
    }
    const systemName = createBillboardedText(scene, galacticObjects[gal].name.key, sphere.position.x, sphere.position.y,nameColor);
    systemName.position = new BABYLON.Vector3(sphere.position.x, sphere.position.y +7, 1);
    scene.addMesh(systemName);






    /*if (output!.galactic_object.hasOwnProperty(gal)) {
      const starClass = output!.galactic_object[gal].star_class;
      const sprite = new BABYLON.Sprite("sprite", spriteManager);
      sprite.position = new BABYLON.Vector3(output!.galactic_object[gal].coordinate.x, output!.galactic_object[gal].coordinate.y, 0.2);
      sprite.size = 10;
      const systemName = makeTextSprite(output!.galactic_object[gal].name.key, { fontsize: 18 }, sprite.position.x, sprite.position.y);
      systemName.position = new BABYLON.Vector3(sprite.position.x, sprite.position.y, 1);
      scene.addMesh(systemName);

      count++;
    }*/
  }
}

function drawHyperlanes(galacticObjects : any) {

  if (!galacticObjects) 
    return;

  for (let gal in galacticObjects) {
    for (let lane in galacticObjects[gal].hyperlane) {
      const points = [
        new BABYLON.Vector3(galacticObjects[gal].coordinate.x, galacticObjects[gal].coordinate.y, 0),
        new BABYLON.Vector3(galacticObjects[galacticObjects[gal].hyperlane[lane].to].coordinate.x,galacticObjects[galacticObjects[gal].hyperlane[lane].to].coordinate.y, 0)
      ];

      console.log(points)
      const line = BABYLON.MeshBuilder.CreateLines("line", { points: points }, scene);
      line.color = new BABYLON.Color3(1, 0, 1);
      scene.addMesh(line)
    }
  }
}

function drawBorders() {
  for (let iCountry in output!.country) {
    countries++;
  }

  bordersArray = Array.from(Array(countries), () => new Array(0));

  for (let iStarbases in output!.starbases) {
    let stringColor = output!.country[output!.starbases[iStarbases].owner].flag.colors[0];
    stringColor = stringColor.substring(stringColor.indexOf("_") + 1);
    const countryColor = stringColor === 'burgundy' ? new BABYLON.Color3(0.48, 0.03, 0.22) : BABYLON.Color3.FromHexString(stringColor);

    const circle = BABYLON.MeshBuilder.CreateDisc("circle", { radius: 16, tessellation: 16 }, scene);
    circle.position = new BABYLON.Vector3(output!.galactic_object[output!.starbases[iStarbases].system].coordinate.x, output!.galactic_object[output!.starbases[iStarbases].system].coordinate.y, -1);
    circle.material = new BABYLON.StandardMaterial("material", scene);
    (circle.material as BABYLON.StandardMaterial).diffuseColor = countryColor;
    circle.material.alpha = 0.5;

    if (output!.starbases[iStarbases].owner) {
      bordersArray[output!.starbases[iStarbases].owner].push(new BABYLON.Vector3(
        output!.galactic_object[output!.starbases[iStarbases].system].coordinate.x,
        output!.galactic_object[output!.starbases[iStarbases].system].coordinate.y, -1));
    }
  }

  for (let iCountry in output!.country) {
    const countryIndex = parseInt(iCountry, 10);
    if (bordersArray[countryIndex] && bordersArray[countryIndex].length >= 4) {
      let stringColor = output!.country[countryIndex].flag.colors[0];
      stringColor = stringColor.substring(stringColor.indexOf("_") + 1);
      const countryColor = stringColor === 'burgundy' ? new BABYLON.Color3(0.48, 0.03, 0.22) : BABYLON.Color3.FromHexString(stringColor);

      const border = BABYLON.MeshBuilder.CreatePolygon("border", { shape: bordersArray[parseInt(iCountry)] }, scene);
      border.material = new BABYLON.StandardMaterial("material", scene);
      (border.material as BABYLON.StandardMaterial).diffuseColor = countryColor;
    }
  }
}

function createBillboardedText(scene: BABYLON.Scene, message: string, x: number, y: number, color?: string): BABYLON.Mesh {
  const plane = BABYLON.MeshBuilder.CreatePlane("textPlane", { size: 40 }, scene);
  plane.position = new BABYLON.Vector3(x, y, 0);

  const advancedTexture = AdvancedDynamicTexture.CreateForMesh(plane);
  const textBlock = new TextBlock();
  textBlock.text = message;
  textBlock.color = color || "white";

  textBlock.fontSize = 200;
  advancedTexture.addControl(textBlock);

  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL; // Enable billboarding

  return plane;
}

engine.runRenderLoop(function() {
  scene.render();
});

window.addEventListener("resize", function() {
  engine.resize();
});