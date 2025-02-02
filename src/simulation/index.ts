export type SimulationOptions = {
  tapeSize: number;
  programs: number;
};

export const defaultOptions: SimulationOptions = {
  tapeSize: 256,
  programs: 1,
};

async function createSimulation(
  device: GPUDevice,
  { tapeSize, programs } = defaultOptions
) {
  // ✅ Create Tape Data Buffer
  const tapeBuffer = device.createBuffer({
    size: tapeSize * programs * 4,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });

  // ✅ Create Head Positions Buffer (head0, head1)
  const headBuffer = device.createBuffer({
    size: programs * 2 * 4, // Two uint32 per program
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });

  const bufferLayouts = [
    {
      binding: 0,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "storage" as GPUBufferBindingType },
    },
    {
      binding: 1,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "storage" as GPUBufferBindingType },
    },
  ];

  // ✅ Create Bind Group Layout
  const bindGroupLayout = device.createBindGroupLayout({
    entries: bufferLayouts,
  });

  // ✅ Create Bind Group
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: tapeBuffer } }, // Tape data
      { binding: 1, resource: { buffer: headBuffer } }, // Head positions
    ],
  });

  // ✅ Create Pipeline Layout
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  const shaderModule = device.createShaderModule({
    code: `
        struct Tape {
            data: array<u32>,
        };
        
        struct Heads {
            head0: u32,
            head1: u32,
        };

        @group(0) @binding(0) var<storage, read_write> tapes: Tape;
        @group(0) @binding(1) var<storage, read_write> heads: array<Heads>;

        @compute @workgroup_size(1)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
            let idx = id.x;
            if (idx >= ${programs}u) { return; }

            var head0 = heads[idx].head0;
            var head1 = heads[idx].head1;
            
            let instruction = tapes.data[idx * ${tapeSize}u + head0];

            switch (instruction) {
                case 60u: { // '<' (Move head0 left)
                    if (head0 > 0u) { head0 -= 1u; }
                    else { head0 = ${tapeSize - 1}u; }
                }
                case 62u: { // '>' (Move head0 right)
                    if (head0 < ${tapeSize - 1}u) { head0 += 1u; }
                    else { head0 = 0u; }
                }
                case 123u: { // '{' (Move head1 left)
                    if (head1 > 0u) { head1 -= 1u; }
                    else { head1 = ${tapeSize - 1}u; }
                }
                case 125u: { // '}' (Move head1 right)
                    if (head1 < ${tapeSize - 1}u) { head1 += 1u; }
                    else { head1 = 0u; }
                }
                case 45u: { // '-' (Decrement value at head0)
                    let value = tapes.data[idx * ${tapeSize}u + head0];
                    if (value > 0u) { tapes.data[idx * ${tapeSize}u + head0] -= 1u; }
                    else { tapes.data[idx * ${tapeSize}u + head0] = 255u; }
                }
                case 43u: { // '+' (Increment value at head0)
                    let value = tapes.data[idx * ${tapeSize}u + head0];
                    if (value < 255u) { tapes.data[idx * ${tapeSize}u + head0] += 1u; }
                    else { tapes.data[idx * ${tapeSize}u + head0] = 0u; }
                }
                case 46u: { // '.' (Copy head0 to head1)
                    let neighbor = (idx + 1u) % ${programs}u;
                    tapes.data[neighbor * ${tapeSize}u + head1] = tapes.data[idx * ${tapeSize}u + head0];
                }
                case 44u: { // ',' (Copy head1 to head0)
                    let neighbor = (idx + 1u) % ${programs}u;
                    tapes.data[idx * ${tapeSize}u + head0] = tapes.data[neighbor * ${tapeSize}u + head1];
                }
                default: {}
            }

            // ✅ Store updated heads
            heads[idx].head0 = head0;
            heads[idx].head1 = head1;
        }
        `,
  });

  // ✅ Create Compute Pipeline with the Correct Layout
  const pipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: { module: shaderModule, entryPoint: "main" },
  });

  return { tapeBuffer, headBuffer, bindGroup, pipeline };
}

export default createSimulation;
