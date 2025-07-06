import { Outlet } from 'react-router';
import { FAQ_PAGES } from '~/faq/FAQPages';
import { ResponsiveNav } from '~/features/nav/ResponsiveNav';
import { TabNavLink } from '~/features/nav/TabNavLink';

export function FaqTab() {
  return (
    <div className="flex flex-col flex-1 container w-full">
      <ResponsiveNav
        className="grow h-full overflow-auto"
        contentClassName="flex flex-col overflow-auto px-8"
        navigationClassName="overflow-x-auto pb-[2px] md:pb-0 h-full md:items-start [&]:md:flex"
        navigation={
          <div role="tablist" className="tabs gap-1 flex-nowrap md:flex-col grow items-center">
            {FAQ_PAGES.map(({ id, name }) => (
              <TabNavLink key={id} to={`/questions/${id}`}>
                {name}
              </TabNavLink>
            ))}
          </div>
        }
      >
        <Outlet />
      </ResponsiveNav>
    </div>
  );
}
