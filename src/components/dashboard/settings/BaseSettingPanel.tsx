import React from "react";

type Props = {
  heading: string;
  children: React.ReactNode;
};

export default function BaseSettingPanel(props: Props) {
  return (
    <div className="border border-border-200 p-4 rounded-xl bg-bg-200">
      <h2 className="text-xl font-medium mb-4">{props.heading}</h2>
      {props.children}
    </div>
  );
}
