import React, { useCallback, useMemo, useState } from "react";
import { jt, t } from "ttag";
import Toggle from "metabase/core/components/Toggle";
import Fields from "metabase/entities/fields";
import Tables from "metabase/entities/tables";
import LoadingAndErrorWrapper from "metabase/components/LoadingAndErrorWrapper";
import { Field, Table } from "metabase-types/api";
import { UiParameter } from "metabase-lib/parameters/types";
import { usableAsLinkedFilter } from "../../utils/linked-filters";
import useFilterFields from "./use-filter-fields";
import {
  SectionRoot,
  SectionHeader,
  SectionMessage,
  SectionMessageLink,
  ParameterRoot,
  ParameterBody,
  ParameterName,
  FieldRoot,
  FieldLabel,
  FieldListRoot,
  FieldListItem,
  FieldListHeader,
  FieldListTitle,
} from "./ParameterLinkedFilters.styled";

export interface ParameterLinkedFiltersProps {
  parameter: UiParameter;
  otherParameters: UiParameter[];
  onChangeFilteringParameters: (
    parameterId: string,
    filteringParameters: string[],
  ) => void;
  onShowAddParameterPopover: () => void;
}

const ParameterLinkedFilters = ({
  parameter,
  otherParameters,
  onChangeFilteringParameters,
  onShowAddParameterPopover,
}: ParameterLinkedFiltersProps): JSX.Element => {
  const currentParameterId = parameter.id;
  const [expandedParameterId, setExpandedParameterId] = useState<string>();

  const filteringParameters = useMemo(
    () => parameter.filteringParameters ?? [],
    [parameter],
  );

  const usableParameters = useMemo(
    () => otherParameters.filter(usableAsLinkedFilter),
    [otherParameters],
  );

  const handleFilterChange = useCallback(
    (otherParameter: UiParameter, isFiltered: boolean) => {
      const newParameters = isFiltered
        ? filteringParameters.concat(otherParameter.id)
        : filteringParameters.filter(id => id !== otherParameter.id);

      onChangeFilteringParameters(currentParameterId, newParameters);
    },
    [currentParameterId, filteringParameters, onChangeFilteringParameters],
  );

  const handleExpandedChange = useCallback(
    (otherParameter: UiParameter, isExpanded: boolean) => {
      setExpandedParameterId(isExpanded ? otherParameter.id : undefined);
    },
    [],
  );

  return (
    <SectionRoot>
      <SectionHeader>{t`Limit this filter's choices`}</SectionHeader>
      {usableParameters.length === 0 ? (
        <div>
          <SectionMessage>
            {t`If you have another dashboard filter, you can limit the choices that are listed for this filter based on the selection of the other one.`}
          </SectionMessage>
          <SectionMessage>
            {jt`So first, ${(
              <SectionMessageLink
                key="link"
                onClick={onShowAddParameterPopover}
              >
                {t`add another dashboard filter`}
              </SectionMessageLink>
            )}.`}
          </SectionMessage>
        </div>
      ) : (
        <div>
          <SectionMessage>
            {jt`If you toggle on one of these dashboard filters, selecting a value for that filter will limit the available choices for ${(
              <em key="text">{t`this`}</em>
            )} filter.`}
          </SectionMessage>
          {usableParameters.map(otherParameter => (
            <LinkedParameter
              key={otherParameter.id}
              parameter={parameter}
              otherParameter={otherParameter}
              isFiltered={filteringParameters.includes(parameter.id)}
              isExpanded={otherParameter.id === expandedParameterId}
              onFilterChange={handleFilterChange}
              onExpandedChange={handleExpandedChange}
            />
          ))}
        </div>
      )}
    </SectionRoot>
  );
};

interface LinkedParameterProps {
  parameter: UiParameter;
  otherParameter: UiParameter;
  isFiltered: boolean;
  isExpanded: boolean;
  onFilterChange: (otherParameter: UiParameter, isFiltered: boolean) => void;
  onExpandedChange: (otherParameter: UiParameter, isExpanded: boolean) => void;
}

const LinkedParameter = ({
  parameter,
  otherParameter,
  isFiltered,
  isExpanded,
  onFilterChange,
  onExpandedChange,
}: LinkedParameterProps): JSX.Element => {
  const handleFilterToggle = useCallback(
    (isFiltered: boolean) => {
      onFilterChange(otherParameter, isFiltered);
    },
    [otherParameter, onFilterChange],
  );

  const handleExpandedChange = useCallback(() => {
    onExpandedChange(otherParameter, !isExpanded);
  }, [isExpanded, otherParameter, onExpandedChange]);

  return (
    <ParameterRoot>
      <ParameterBody>
        <ParameterName onClick={handleExpandedChange}>
          {otherParameter.name}
        </ParameterName>
        <Toggle value={isFiltered} onChange={handleFilterToggle} />
      </ParameterBody>
      {isExpanded && (
        <LinkedFieldList
          parameter={parameter}
          otherParameter={otherParameter}
        />
      )}
    </ParameterRoot>
  );
};

interface LinkedFieldListProps {
  parameter: UiParameter;
  otherParameter: UiParameter;
}

const LinkedFieldList = ({
  parameter,
  otherParameter,
}: LinkedFieldListProps) => {
  const { data, error, loading } = useFilterFields(parameter, otherParameter);

  return (
    <LoadingAndErrorWrapper loading={loading} error={error}>
      <FieldListRoot>
        {data && data.length > 0 && (
          <FieldListHeader>
            <FieldListTitle>{t`Filtering column`}</FieldListTitle>
            <FieldListTitle>{t`Filtered column`}</FieldListTitle>
          </FieldListHeader>
        )}
        {data?.map(([filteringId, filteredId]) => (
          <FieldListItem key={filteredId}>
            <LinkedField fieldId={filteringId} />
            <LinkedField fieldId={filteredId} />
          </FieldListItem>
        ))}
      </FieldListRoot>
    </LoadingAndErrorWrapper>
  );
};

interface LinkedFieldProps {
  fieldId: string;
}

const LinkedField = ({ fieldId }: LinkedFieldProps) => {
  return (
    <Fields.Loader id={fieldId}>
      {({ field }: { field: Field }) => (
        <FieldRoot>
          <FieldLabel>
            <Tables.Loader id={field.table_id}>
              {({ table }: { table: Table }) => (
                <span>{table.display_name}</span>
              )}
            </Tables.Loader>
          </FieldLabel>
          <div>{field.display_name}</div>
        </FieldRoot>
      )}
    </Fields.Loader>
  );
};

export default ParameterLinkedFilters;
