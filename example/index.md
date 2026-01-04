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
class Dog {
  final String name;

  String get breed => "Unknown Breed"; 
  
  Dog(this.name, this.breed);

  void bark() {
    print("Woof! Woof!");
  }
}
final myDog = Dog("Buddy", "Golden Retriever");
myDog.breed;
```

```ts twoslash
// @errors: 2554 2339
class Animal {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}
class Dog extends Animal {
  constructor(name: string) {
    super(name);
    console.log(name);
  }
}
const myDog = new Dog("Buddy", "Golden Retriever");
myDog.breed;
```