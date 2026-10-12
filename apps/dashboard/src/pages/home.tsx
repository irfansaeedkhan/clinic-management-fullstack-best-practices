import React from "react";
import { env } from "@/config/env";
import { Button } from "@/components/ui/button";

export const Home: React.FC = () => {
  return (
    <main>
      <h1 className="text-2xl font-bold text-red-500">Hello World</h1>
      <Button onClick={() => console.log("clicked")}>Click me {env.VITE_APP_ENV}</Button>
    </main>
  );
};
