const loadDevServerConfig = () => {
  jest.resetModules();
  return require("../../config/webpackDevServer.config");
};

describe("webpack development server", () => {
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it("publishes the configured LAN WebSocket endpoint to browser clients", () => {
    process.env.WDS_SOCKET_HOST = "10.10.101.210";
    process.env.WDS_SOCKET_PATH = "/ws";
    process.env.WDS_SOCKET_PORT = "80";

    const config = loadDevServerConfig()(undefined, undefined);

    expect(config.client.webSocketURL).toEqual({
      hostname: "10.10.101.210",
      pathname: "/ws",
      port: "80",
      protocol: "ws",
    });
  });
});
