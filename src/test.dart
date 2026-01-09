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
  final dynamic title;
  final dynamic child;

  ShadAccordionItem({
    required this.value,
    required this.title,
    required this.child,
  });
}

class Node<T> { T? next; }

class Text {
  final String data;

  Text(this.data);
}

class BuildContext {}

class Widget {}

class Tree<T> {
  T value;
  List<Tree<T>> children;

  Tree({required this.value, this.children = const []});
}

void main() {
  final data = [1, 2, 3];
  num toNum(int x) => x;
  String twoArgs(String a, String b) => a + b;
  T identity<T>(T x) => x;

data.map(toNum); // What is R here?
  final newData = [];
  final result = data.map((e) {
    print(e);
  });
  data.map((e) {
  if (condition) return 1;
  else return null;
});
  data.map((e) => throw Exception());
  data.map((e) {
  if (condition) return 1;
  else throw Exception();
}); // R = int?
}

extension IterableExtensions<E> on Iterable<E> {
  R foo<R>(R Function(E) f, R defaultValue) {
    return this.map(f).firstWhere((_) => true, orElse: () => defaultValue);
  }
}

String bark(String sound) {
  return "Woof! Woof! ${sound}";
}