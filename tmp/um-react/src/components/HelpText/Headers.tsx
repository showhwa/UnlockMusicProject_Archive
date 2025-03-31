import { Heading } from '@chakra-ui/react';
import React from 'react';

export interface HeaderProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
}

export function Header3({ children, className, id }: HeaderProps) {
  return (
    <Heading
      as="h3"
      id={id}
      className={className}
      pt={3}
      pb={1}
      borderBottom={'1px solid'}
      borderColor="gray.300"
      color="gray.800"
      size="lg"
    >
      {children}
    </Heading>
  );
}

export function Header4({ children, className, id }: HeaderProps) {
  return (
    <Heading as="h4" id={id} className={className} pt={3} pb={1} color="gray.700" size="md">
      {children}
    </Heading>
  );
}

export function Header5({ children, className, id }: HeaderProps) {
  return (
    <Heading as="h5" id={id} className={className} pt={3} pb={1} color="gray.700" size="sm">
      {children}
    </Heading>
  );
}
