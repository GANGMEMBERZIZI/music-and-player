const server = Bun.serve({
  port: 4000,
  routes: {
    "/api/music": () => { 
      return new Response(); 
    } 
  }
});
