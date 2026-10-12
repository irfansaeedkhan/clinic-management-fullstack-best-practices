import React from "react";

interface Props {
  title: string;
}

export const PageTitle: React.FC<Props> = ({ title }) => {
  return <h1 className="text-sm font-medium">{title}</h1>;
};
