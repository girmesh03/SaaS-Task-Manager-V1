import { createBrowserRouter } from "react-router";

import { MuiLoading } from "../components/reusable";

import { Home } from "../pages/index.js";

const routes = createBrowserRouter([
  {
    path: "/",
    Component: Home,
    HydrateFallback: MuiLoading,
  },
]);

export default routes;
