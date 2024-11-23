import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders'; // Ensure you have installed babylonjs-loaders for DDS support

declare global {
  interface Window {
    bridgeData: (gamestate: string) => void;
  }
}

window.bridgeData = function(gamestate) {
  loadSave(gamestate);
};

// Create the Babylon.js engine and scene
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

// Create a camera and light
const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2, Math.PI / 2, 2, BABYLON.Vector3.Zero(), scene);
camera.attachControl(canvas, true);
const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);

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

function loadSave(gamestate: string) {
  output = JSON.parse(gamestate); // Assuming gamestate is a JSON string

  // DRAW SKYBOX
  drawSkyBox();

  // DRAW SYSTEMS
  drawSystems();

  // DRAW HYPER LANES
  drawHyperlanes();

  // DRAW BORDERS
  drawBorders();

  // Add the canvas to the document body
  const renderingCanvas = engine.getRenderingCanvas();
  if (renderingCanvas) {
    document.body.appendChild(renderingCanvas);
  }
}

function drawSkyBox() {
  const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 5000 }, scene);
  const skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
  skyboxMaterial.backFaceCulling = false;
  skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/ame_nebula/ame_nebula", scene);
  skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
  skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
  skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
  skybox.material = skyboxMaterial;
}

function drawSystems() {
  const spriteManager = new BABYLON.SpriteManager("spriteManager", "textures/center.dds", 2000, { width: 64, height: 64 }, scene);

  const sprite = new BABYLON.Sprite("sprite", spriteManager);
  sprite.position = new BABYLON.Vector3(0, 0, 0);
  if (output) {
    sprite.size = output!.galaxy_radius;
  }

  if (!output) return;

  for (let gal in output!.galactic_object) {
    if (output!.galactic_object.hasOwnProperty(gal)) {
      const starClass = output!.galactic_object[gal].star_class;
      const sprite = new BABYLON.Sprite("sprite", spriteManager);
      sprite.position = new BABYLON.Vector3(output!.galactic_object[gal].coordinate.x, output!.galactic_object[gal].coordinate.y, 0.2);
      sprite.size = 10;
      const systemName = makeTextSprite(output!.galactic_object[gal].name.key, { fontsize: 18 }, sprite.position.x, sprite.position.y);
      systemName.position = new BABYLON.Vector3(sprite.position.x, sprite.position.y, 1);
      scene.addMesh(systemName);

      count++;
    }
  }
}

function drawHyperlanes() {
  for (let gal in output!.galactic_object) {
    for (let lane in output!.galactic_object[gal].hyperlane) {
      const points = [
        new BABYLON.Vector3(output!.galactic_object[gal].coordinate.x, output!.galactic_object[gal].coordinate.y, 0),
        new BABYLON.Vector3(output!.galactic_object[output!.galactic_object[gal].hyperlane[lane].to].coordinate.x, output!.galactic_object[output!.galactic_object[gal].hyperlane[lane].to].coordinate.y, 0)
      ];
      const line = BABYLON.MeshBuilder.CreateLines("line", { points: points }, scene);
      line.color = new BABYLON.Color3(0, 0, 1);
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

function makeTextSprite(message: string, parameters: any, x: number, y: number) {
  const dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 512, scene, true);
  dynamicTexture.hasAlpha = true;
  dynamicTexture.drawText(message, null, null, "bold 44px Arial", "white", "transparent", true);

  const plane = BABYLON.MeshBuilder.CreatePlane("textPlane", { size: 2 }, scene);
  plane.position = new BABYLON.Vector3(x, y, 0);
  plane.material = new BABYLON.StandardMaterial("textPlaneMaterial", scene);
  (plane.material as BABYLON.StandardMaterial).diffuseTexture = dynamicTexture;
  plane.material.backFaceCulling = false;

  return plane;
}

engine.runRenderLoop(function() {
  scene.render();
});

window.addEventListener("resize", function() {
  engine.resize();
});