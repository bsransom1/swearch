/// <reference types="vite/client" />

// Allow ?inline CSS imports in panel-injector
declare module "*.css?inline" {
  const content: string;
  export default content;
}
