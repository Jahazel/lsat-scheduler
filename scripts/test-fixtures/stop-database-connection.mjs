import mongoose from "mongoose";

// The child runs the real command entry point. Stop it at the connection boundary.
// This fixture is loaded only by tests, never by a package command.
mongoose.connect = async () => {
  throw new Error("Test stopped before database connection.");
};
