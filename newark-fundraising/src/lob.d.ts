declare module 'lob' {
  interface LobConfig {
    apiKey: string;
  }
  class Lob {
    constructor(config: LobConfig);
    letters: {
      create(params: any): Promise<any>;
    };
  }
  export default Lob;
}
