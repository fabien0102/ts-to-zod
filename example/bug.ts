import { Description } from "./description";

export interface Foo {
  foo: string;
}

export interface Bar {
  hello: Foo;
  desc: Description;
}
