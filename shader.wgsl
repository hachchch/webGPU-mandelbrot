  struct VertexInput {
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
}
