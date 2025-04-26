import Fastify from "fastify";
import helmet from "@fastify/helmet";
var server = Fastify({});
server
  .register(helmet, {
    crossOriginEmbedderPolicy: { policy: "require-corp" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    contentSecurityPolicy: {
      // reportOnly: true,
      directives: {
        "script-src": [""],
      },
      useDefaults: true,
    },
    // enableCSPNonces: true,
    xPoweredBy: false,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "same-origin" },
    xPermittedCrossDomainPolicies: { permittedPolicies: "none" },
    xDnsPrefetchControl: { allow: false },
    xFrameOptions: { action: "deny" },
  })
  .get("/", (_, reply) => {
    reply.send("thanks");
  });
await server.ready();
server.listen({ port: 8080, host: "localhost" });
