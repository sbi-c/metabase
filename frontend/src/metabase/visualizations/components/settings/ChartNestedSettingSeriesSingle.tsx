/* eslint-disable react/prop-types */
import React from "react";

import { getAccentColors } from "metabase/lib/colors/groups";
import ColorSelector from "metabase/core/components/ColorSelector";
import { Series } from "metabase-types/types/Visualization";
import { VisualizationSettings } from "metabase-types/api/card";

import { SeriesNameInput } from "./ChartNestedSettingSeries.styled";

export interface ChartNestedSettingsSeriesSingleProps {
  object: Series;
  getObjectKey: (object: Series) => string;
  onChangeObjectSettings: (object: Series, value: Record<string, any>) => void;
  objectSettingsWidgets: React.ReactNode[];
  allComputedSettings: VisualizationSettings;
}

// various props injected by chartSettingNestedSettings HOC
const ChartNestedSettingsSeriesSingle = ({
  getObjectKey,
  onChangeObjectSettings,
  objectSettingsWidgets,
  object,
  allComputedSettings,
}: ChartNestedSettingsSeriesSingleProps) => {
  const objectKey = object && getObjectKey(object);
  const computedSettings = allComputedSettings[objectKey] || {};

  return (
    <div key={objectKey} className="px4 align-self-stretch">
      <div className="flex align-center border-bottom pb2">
        <ColorSelector
          value={computedSettings.color}
          colors={getAccentColors()}
          onChange={value => onChangeObjectSettings(object, { color: value })}
        />
        <SeriesNameInput
          className="flex-full ml1 align-self-stretch"
          value={computedSettings.title}
          data-testid="series-name-input"
          onBlurChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChangeObjectSettings(object, { title: e.target.value })
          }
        />
      </div>
      {objectSettingsWidgets && objectSettingsWidgets.length > 0 ? (
        <div className="mt3">{objectSettingsWidgets}</div>
      ) : null}
    </div>
  );
};

export default ChartNestedSettingsSeriesSingle;
