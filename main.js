let product=2;
let N=100;
let scale=1;
let range={x:[-1,1],y:[-1,1]};
let offset={x:0,y:0};
let pass;
let encoder;
var device;
var ctx;
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
  code:  `struct VertexInput {
  @location(0) pos: vec2f,
  @builtin(instance_index) instance: u32,
};

struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(0) cell: vec2f,
};

fn hsl2rgb(hsl: vec3f) -> vec3f {
let c = vec3f(fract(hsl.x), clamp(hsl.yz, vec2f(0), vec2f(1)));
let rgb = clamp(abs((c.x * 6.0 + vec3f(0.0, 4.0, 2.0)) % 6.0 - 3.0) - 1.0, vec3f(0), vec3f(1));
return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

@group(0) @binding(0) var<uniform> grid: vec2f;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput  {
  let i = f32(input.instance);
  let cell = vec2f(i % grid.x, floor(i / grid.x));
  let cellOffset = cell/grid*2;
  let gridPos = (input.pos + 1) / grid - 1 + cellOffset;
  
  var output: VertexOutput;
  output.pos = vec4f(gridPos, 0, 1);
  output.cell = cell;
  return output;
}
@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f{
let range=vec4f(${range.x[0]/scale},${range.x[1]/scale},${range.y[0]/scale},${range.y[1]/scale});
  let c = input.cell / grid;
  let x=(input.cell.x/grid.x)*(range.y-range.x)+range.x+${offset.x};
  let y=(input.cell.y/grid.y)*(range.w-range.z)+range.z+${offset.y};
  let N:f32=${N};
  let product: f32=${product};
  var real:f32=0;
  var imag:f32=0;
  var i: f32=0;
  while(i<N){
  if(sqrt(pow(real,2)+pow(imag,2))>2){
  break;
  }
  if(product==2){
  let zI: f32=y+2*real*imag;
  real=x+pow(real,2)-pow(imag,2);
  imag=zI;
  }else{
  let lnr=log(sqrt(pow(real,2)+pow(imag,2)));
  let argz=atan2(imag,real);
  real=x+exp(product*lnr)*cos(product*argz);
  imag=y+exp(product*lnr)*sin(product*argz);
  }
  i+=1;
  }
  var color:f32=(i/N);
  let colorScheme=${colorScheme};
  if(i==N && colorScheme!=1){
  color=0;
  }
  var res=vec4f(0);
  if(colorScheme==0){
  res=vec4f(color,color,color,1);
  }
  if(colorScheme==1){
  let r=sqrt(pow(real,2)+pow(imag,2));
  var lnr=(log(r));
  lnr=lnr-floor(lnr);
  if(lnr>0.5){
  lnr=1-lnr;
  }
  let argz=(atan2(imag,real)/${Math.PI}+1)/2;
  if(i==N){
  res=vec4f(argz/10,lnr*2,lnr,1);
  }else{
  res=vec4f(argz/5,lnr/2.5,sin(color*${Math.PI}),1);
  }
  }
  if(colorScheme==2){
  res=vec4f(color,color,sin(color*${Math.PI}),1);
  }
  return res;
}`
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
