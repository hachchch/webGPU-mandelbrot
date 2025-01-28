let product=2;
let N=100;
let scale=1;
let range={x:[-1,1],y:[-1,1]};
let offset={x:0,y:0};
let pass;
let encoder;
var device;
var ctx;
var shaderProgram;
var colorScheme=2n;
var canvasFormat;
let GRID_SIZE = 850;
const canvas = document.querySelector(".canvas");
canvas.width=GRID_SIZE;
canvas.height=GRID_SIZE;
if (!navigator.gpu) {
  throw new Error("WebGPU not supported on this browser.");
}
async function init(){
const adapter = await navigator.gpu.requestAdapter();
if (!adapter) {
  throw new Error("No appropriate GPUAdapter found.");
}
    device = await adapter.requestDevice();
    ctx = canvas.getContext("webgpu");
    canvasFormat = navigator.gpu.getPreferredCanvasFormat();
ctx.configure({
  device: device,
  format: canvasFormat,
});
    encoder = device.createCommandEncoder();
    pass = encoder.beginRenderPass({
  colorAttachments: [{
     view: ctx.getCurrentTexture().createView(),
     loadOp: "clear",
      clearValue: { r: 0, g: 0, b: 0.4, a: 1 },
     storeOp: "store",
  }]
});
    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
    draw();
}
init();
function draw(){
    const vertices = new Float32Array([
  -1, -1,
   1, -1,
   1,  1,
  -1, -1,
   1,  1,
  -1,  1,
]);
    const vertexBuffer = device.createBuffer({
  label: "Cell vertices",
  size: vertices.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
    device.queue.writeBuffer(vertexBuffer,0, vertices);
    const vertexBufferLayout = {
  arrayStride: 8,
  attributes: [{
    format: "float32x2",
    offset: 0,
    shaderLocation: 0, // Position, see vertex shader
  }],
};
    //シェーダーの定義
    const cellShaderModule = device.createShaderModule({
  label: 'Cell shader',
  code: shaderProgram
});
    const cellPipeline = device.createRenderPipeline({
  label: "Cell pipeline",
  layout: "auto",
  vertex: {
    module: cellShaderModule,
    entryPoint: "vertexMain",
    buffers: [vertexBufferLayout]
  },
  fragment: {
    module: cellShaderModule,
    entryPoint: "fragmentMain",
    targets: [{
      format: canvasFormat
    }]
  }
});
encoder=device.createCommandEncoder();
pass=encoder.beginRenderPass({
    colorAttachments: [{
     view: ctx.getCurrentTexture().createView(),
     loadOp: "clear",
      clearValue: { r: 0, g: 0, b: 0.4, a: 1 }, // New line
     storeOp: "store",
  }]
});
    // Create a uniform buffer that describes the grid.
const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
const uniformBuffer = device.createBuffer({
  label: "Grid Uniforms",
  size: uniformArray.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(uniformBuffer, 0, uniformArray);
const bindGroup = device.createBindGroup({
  label: "Cell renderer bind group",
  layout: cellPipeline.getBindGroupLayout(0),
  entries: [{
    binding: 0,
    resource: { buffer: uniformBuffer }
  }],
});
pass.setPipeline(cellPipeline);
pass.setVertexBuffer(0, vertexBuffer);
pass.setBindGroup(0, bindGroup)
pass.draw(vertices.length / 2, GRID_SIZE * GRID_SIZE);
pass.end()
device.queue.submit([encoder.finish()]);
}
window.addEventListener("keydown",e=>{
    if(e.code=="KeyL"){
        //N=N*6/5;
        scale=scale*1.1;
        draw();
    }
    if(e.code=="KeyJ"){
        //N=N*5/6;
        scale=10*scale/11;
        draw();
    }
    if(e.code=="KeyP"){
        product+=0.01;
        draw();
    }
    if(e.code=="KeyO"){
        product-=0.01;
        draw();
    }
    if(e.code=="KeyI"){
        GRID_SIZE=GRID_SIZE/2;
        draw();
    }
    if(e.code=="KeyU"){
        if(1>GRID_SIZE){
        GRID_SIZE=GRID_SIZE*2;
        }
        draw();
    }
    if(e.code=="KeyY"){
        N=N*2;
        draw();
    }
    if(e.code=="KeyN"){
        N=Math.round(N*1.1);
        draw();
    }
    if(e.code=="KeyT"){
        N=N/2;
        draw();
    }
});
canvas.addEventListener("click",e=>{
    let R=[range.x[0]/scale,range.x[1]/scale,range.y[0]/scale,range.y[1]/scale];
    let m={
        x:e.offsetX,
        y:e.offsetY
    }
    console.log(e.offsetY);
    offset.y=-((m.y/canvas.height)*(R[3]-R[2])+R[2])+offset.y;
    offset.x=(m.x/canvas.width)*(R[1]-R[0])+R[0]+offset.x;
    draw();
});
