import classNames from 'classnames';
import React, { Fragment, useId } from 'react';

export type InstructionTab = {
  id: string | number;
  label: React.ReactNode;
  content: React.ReactNode;
};

export interface InstructionsTabsProps {
  tabs: InstructionTab[];
  limitHeight?: boolean;
}

export function InstructionsTabs({ limitHeight = false, tabs }: InstructionsTabsProps) {
  const id = useId();
  return (
    <div className={classNames('tabs tabs-lift pb-4 mt-2', { 'max-h-[32rem]': limitHeight })}>
      {tabs.map(({ id: _tabId, label, content }, index) => (
        <Fragment key={_tabId}>
          <label className="tab dark:[--tab-border-color:#555]">
            <input type="radio" name={id} defaultChecked={index === 0} />
            {label}
          </label>
          <div
            className={classNames(
              'tab-content border-base-300 dark:border-[#555] bg-base-100 px-4 py-2 overflow-y-auto',
              {
                'max-h-[30rem]': limitHeight,
              },
            )}
          >
            {content}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
