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

class ShadAccordion<T> {
  final Iterable<ShadAccordionItem<T>> children;

  ShadAccordion({required this.children});
}

class ShadAccordionItem<T> {
  final T value;
  final Widget title;
  final Widget child;
  final int index = 0;

  ShadAccordionItem({
    required this.value,
    required this.title,
    required this.child,
  });
}

class Node<T> { T? next; }

class Text extends Widget {
  final String data;

  Text(this.data);
}

class BuildContext {}

class Widget {}

class Tree<T> {
  T value;
  List<Tree<T>> children;

  Tree({required this.value, this.children = const []});

  static staticMethod() {
    print('This is a static method.');
  }
}

extension IterableExtensions<E> on Iterable<E> {
  R foo<R>(R Function(E) f, R defaultValue) {
    return this.map(f).firstWhere((_) => true, orElse: () => defaultValue);
  }
}

String bark(Text sound) {
  return "Woof! Woof! ${sound}";
}

Future<void> main() async {
  final test = Tree(value: 1);
  
}