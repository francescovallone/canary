---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "My Awesome Project"
  text: "A VitePress Site"
  tagline: My great project tagline
  actions:
    - theme: brand
      text: Markdown Examples
      link: /markdown-examples
    - theme: alt
      text: API Examples
      link: /api-examples

features:
  - title: Feature A
    details: Lorem ipsum dolor sit amet, consectetur adipiscing elit
  - title: Feature B
    details: Lorem ipsum dolor sit amet, consectetur adipiscing elit
  - title: Feature C
    details: Lorem ipsum dolor sit amet, consectetur adipiscing elit
---


```dart canary
final details = [
  (
    title: 'Is it acceptable?',
    content: 'Yes. It adheres to the WAI-ARIA design pattern.',
  ),
  (
    title: 'Is it styled?',
    content:
        "Yes. It comes with default styles that matches the other components' aesthetic.",
  ),
  (
    title: 'Is it animated?',
    content:
        "Yes. It's animated by default, but you can disable it if you prefer.",
  ),
];

@override
Widget build(BuildContext context) {
  return ShadAccordion<({String content, String title})>(
    children: details.map(
      (detail) => ShadAccordionItem(
        value: detail,
        title: Text(detail.title),
        child: Text(detail.content),
      ),
    ),
  );
}
```

```ts twoslash
// @errors: 2554 2339
class Animal {
  name: string;
  constructor(name: string) {
    this.name = name;
  }

  bark(): void {
    console.log(`Woof! ${this.name}`);
  }

}
class Dog extends Animal {
  set bar(value: boolean) {
      // do nothing
  }
  get bar(): boolean {
      return true;
  }
  constructor(name: string) {
    super(name);
    console.log(name);
  }
}
const myDog = new Dog("Buddy", "Golden Retriever");
myDog.breed;

function getDogBreed(dog: Dog) {
  return dog.name;
}
```