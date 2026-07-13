declare module "to-ico" {
  function toIco(buffers: Buffer[]): Promise<Buffer>;
  export default toIco;
}
