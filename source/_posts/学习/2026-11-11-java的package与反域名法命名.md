---
title: "java的package与反域名法命名"
date: 2026-11-11 18:22:32
tags: ["java项目"]
---

# Java `package`、`import` 与包命名总结

## 1. `package` 是什么

`package` 用于声明类所属的**包**，类似文件夹，作用是：

- **避免命名冲突**：不同包中可以有同名类。
- **组织代码**：功能相关的类放在同一个包中。
- **控制访问权限**：包影响 `protected`、默认访问修饰符的可见范围。

不声明包时，类属于"无名包"，正式项目不推荐。

---

## 2. `package` 怎么写

规则：

1. 必须是源文件**第一行**（注释除外）。
2. 一个源文件**只能有一条** `package` 语句。
3. 语法：`package 包名;`
4. 包名通常全小写，对应目录结构。

示例：

```java
package com.example.shop.ui.app;

public class MainView {
    public void show() {
        System.out.println("显示主界面");
    }
}
```

对应目录：

```text
com/example/shop/ui/app/MainView.java
```

类的全限定名：

```text
com.example.shop.ui.app.MainView
```

---

## 3. 为什么包名常以 `com` 开头

`com` 来自**域名反转**，用于保证包名全球唯一。

| 域名 | 包名前缀 | 说明 |
|---|---|---|
| `example.com` | `com.example` | 商业公司 |
| `apache.org` | `org.apache` | 非营利组织 |
| `xxx.edu` | `edu.xxx` | 教育机构 |
| `xxx.gov` | `gov.xxx` | 政府机构 |

示例：

```java
package com.example.shop.order;
```

表示：`example.com` 组织下的 `shop` 项目中的 `order` 模块。

不同公司可以都有 `order` 包而不冲突：

```text
com.example.shop.order
com.anothercompany.shop.order
```

---

## 4. `ui.app` 是什么

`ui.app` **不是关键字**，只是包名中的两个层级：

```text
ui  → app
```

例如：

```java
package com.example.shop.ui.app;
```

可理解为：

```text
com.example.shop  → 公司/项目前缀
ui                → 用户界面层（User Interface）
app               → 应用/主界面相关子包（application）
```

对应目录：

```text
com/example/shop/ui/app/
```

`ui.app` 只是开发者约定，没有特殊语法含义。

---

## 5. `import` 的作用

`import` **不执行代码**，只告诉编译器：下面使用的简单类名指哪个包中的类。

真正调用方法靠：

- `new 类()` 创建对象
- `对象.方法()` 调用实例方法
- `类名.静态方法()` 调用静态方法

---

## 6. 同包：不用 `import`

`Product.java` 和 `Order.java` 都在 `com.example.shop.model`：

```java
package com.example.shop.model;

public class Product {
    public void printInfo() {
        System.out.println("商品信息");
    }
}
```

```java
package com.example.shop.model;

public class Order {
    public void test() {
        Product p = new Product();  // 同包，直接使用
        p.printInfo();
    }
}
```

---

## 7. 不同包：使用 `import`

`ProductService` 在 `com.example.shop.service`，使用 `model` 包的 `Product`：

```java
package com.example.shop.service;

import com.example.shop.model.Product;

public class ProductService {
    public void addProduct() {
        Product p = new Product();
        p.printInfo();
    }
}
```

要点：

- `import` 写在 `package` 之后、类定义之前。
- 导入的是**类**，不是方法。
- 可以有多个 `import`。

---

## 8. 不 `import`：使用全限定名

```java
package com.example.shop.service;

public class ProductService {
    public void addProduct() {
        com.example.shop.model.Product p =
                new com.example.shop.model.Product();
        p.printInfo();
    }
}
```

全限定名 = 包名 + 类名。写起来长，但不需要 `import`。

---

## 9. 静态导入

频繁调用静态方法时，可以静态导入：

```java
package com.example.shop.ui.app;

import static com.example.shop.ui.util.ConsoleUtil.line;

public class MainView {
    public void show() {
        line();  // 等价于 ConsoleUtil.line();
    }
}
```

也可以导入所有静态成员：

```java
import static com.example.shop.ui.util.ConsoleUtil.*;
```

静态导入只对 `static` 成员有效。

---

## 10. 同名类冲突

两个包中都有 `User`：

```text
com.example.shop.model.User
com.example.other.User
```

只 `import` 一个，另一个用全限定名：

```java
package com.example.shop.service;

import com.example.shop.model.User;

public class UserService {
    public void test() {
        User u1 = new User("李四");          // model.User

        com.example.other.User u2 =
                new com.example.other.User(); // other.User
    }
}
```

不能同时导入两个同名类：

```java
import com.example.shop.model.User;
import com.example.other.User;  // 编译错误
```

---

## 11. 调用方法的基本形式

假设 `Helper` 有：

```java
public class Helper {
    public Helper() {}                  // 构造方法
    public void help() {}               // 实例方法
    public static void staticHelp() {}  // 静态方法
}
```

调用方式：

```java
// 1. 构造方法
Helper h = new Helper();

// 2. 实例方法
h.help();

// 3. 静态方法：类名.方法()
Helper.staticHelp();
```

---

## 12. 访问权限决定能否调用

即使 `import` 了，也不一定能调用。访问修饰符决定可见性：

| 修饰符 | 同类 | 同包 | 子类 | 任意位置 |
|---|---|---|---|---|
| `public` | ✅ | ✅ | ✅ | ✅ |
| `protected` | ✅ | ✅ | ✅ | ❌ |
| 默认（不写） | ✅ | ✅ | ❌ | ❌ |
| `private` | ✅ | ❌ | ❌ | ❌ |

---

## 13. 完整示例

目录：

```text
src/
  com/example/shop/
    App.java
    model/
      Product.java
    service/
      ProductService.java
    ui/
      app/
        MainView.java
      util/
        ConsoleUtil.java
```

`ConsoleUtil.java`：

```java
package com.example.shop.ui.util;

public class ConsoleUtil {
    public static void line() {
        System.out.println("----------------");
    }
}
```

`MainView.java`：

```java
package com.example.shop.ui.app;

import com.example.shop.ui.util.ConsoleUtil;
import static com.example.shop.ui.util.ConsoleUtil.line;

public class MainView {
    public void show() {
        ConsoleUtil.line();  // 普通导入 + 类名
        line();              // 静态导入后直接调用
        System.out.println("显示主界面");
        line();
    }
}
```

`Product.java`：

```java
package com.example.shop.model;

public class Product {
    public void printInfo() {
        System.out.println("商品信息");
    }
}
```

`ProductService.java`：

```java
package com.example.shop.service;

import com.example.shop.model.Product;

public class ProductService {
    public void addProduct() {
        Product p = new Product();
        p.printInfo();
    }
}
```

`App.java`：

```java
package com.example.shop;

import com.example.shop.service.ProductService;
import com.example.shop.ui.app.MainView;

public class App {
    public static void main(String[] args) {
        ProductService ps = new ProductService();
        ps.addProduct();

        MainView view = new MainView();
        view.show();

        // 全限定名调用
        com.example.shop.ui.util.ConsoleUtil.line();
    }
}
```

输出类似：

```text
商品信息
----------------
----------------
显示主界面
----------------
----------------
```

---

## 14. 对照表

| 场景 | 写法 | 示例 |
|---|---|---|
| 同包类 | 直接类名，不用 `import` | `new Product()` |
| 不同包 | `import 包.类;` + 简单类名 | `import com.example.shop.model.Product;` |
| 不想 `import` | 全限定名 | `new com.example.other.User()` |
| 同名类冲突 | `import` 一个，另一个用全限定名 | 见第 10 节 |
| 频繁调用静态方法 | 静态导入 | `import static ...ConsoleUtil.line;` |
| 调用实例方法 | `对象.方法()` | `p.printInfo()` |
| 调用静态方法 | `类名.方法()` | `ConsoleUtil.line()` |

---

## 15. 一句话总结

`package` 声明类所属的包；`com` 是域名反转的命名惯例；`ui.app` 只是包路径中的两个普通层级；`import` 只解决"名字指代谁"，真正调用方法靠 `new 对象` 后 `对象.方法()`，或 `类名.静态方法()`；同包不用 `import`，不同包用 `import` 或全限定名；最终能否调用还受访问修饰符限制。