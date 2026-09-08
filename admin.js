import {
  auth,
  db
} from "./firebase-config.js";


import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


/* اختصار */

const $ = id =>
  document.getElementById(id);


/* التطبيقات الافتراضية */

let apps = [

  {
    id: "yoho",
    name: "YoHo",
    icon: "Y"
  },

  {
    id: "ya",
    name: "يا أهلاً",
    icon: "ي"
  },

  {
    id: "zaffa",
    name: "Zaffa",
    icon: "Z"
  }

];


let selectedAppId =
  "yoho";


let packages = [];


/* تسجيل الدخول */

$("login").onclick =
  async () => {

    try {

      await signInWithEmailAndPassword(

        auth,

        $("email").value,

        $("password").value

      );

    } catch (error) {

      console.error(error);

      $("loginMsg").textContent =
        "بيانات الدخول غير صحيحة أو الحساب غير مفعّل.";

    }

  };


/* تسجيل الخروج */

$("logout").onclick =
  () => {

    signOut(auth);

  };


/* مراقبة المستخدم */

onAuthStateChanged(
  auth,
  async user => {

    if (!user) {

      $("dashboard")
        .classList
        .add("hidden");

      $("loginCard")
        .classList
        .remove("hidden");

      return;

    }


    try {

      /*
       التحقق من صلاحية المدير
      */

      const adminDocument =
        await getDoc(
          doc(
            db,
            "adminUsers",
            user.uid
          )
        );


      if (
        !adminDocument.exists() ||
        adminDocument.data().active !== true
      ) {

        throw new Error(
          "Not admin"
        );

      }


      $("loginCard")
        .classList
        .add("hidden");


      $("dashboard")
        .classList
        .remove("hidden");


      await loadSettings();

      renderApps();

      renderAppSelector();

      await selectApp(
        selectedAppId
      );

      listenOrders();


    } catch (error) {

      console.error(error);

      $("loginMsg").textContent =
        "هذا الحساب ليس مديراً مصرحاً به.";

      await signOut(auth);

    }

  }
);


/* تحميل الإعدادات */

async function loadSettings() {

  /*
   رقم فودافون
  */

  const storeSnapshot =
    await getDoc(
      doc(
        db,
        "settings",
        "store"
      )
    );


  if (
    storeSnapshot.exists()
  ) {

    $("cashNumber").value =
      storeSnapshot.data()
        .vodafoneCash || "";

  }


  /*
   التطبيقات
  */

  const appsSnapshot =
    await getDoc(
      doc(
        db,
        "settings",
        "apps"
      )
    );


  if (
    appsSnapshot.exists() &&
    Array.isArray(
      appsSnapshot.data().items
    )
  ) {

    apps =
      appsSnapshot.data().items;

  }


  selectedAppId =
    apps[0]?.id ||
    "yoho";

}


/* عرض التطبيقات */

function renderApps() {

  $("appList").innerHTML =
    apps
      .map(
        (app, index) => {

          return `

            <div
              class="app-row">

              <input
                data-index="${index}"
                data-key="name"
                value="${app.name}"
                placeholder="اسم التطبيق">


              <input
                data-index="${index}"
                data-key="icon"
                value="${app.icon || "★"}"
                placeholder="الأيقونة">

            </div>

          `;

        }
      )
      .join("");


  document
    .querySelectorAll(
      "#appList input"
    )
    .forEach(input => {

      input.oninput =
        () => {

          const index =
            Number(
              input.dataset.index
            );


          const key =
            input.dataset.key;


          apps[index][key] =
            input.value;

        };

    });

}


/* اختيار التطبيق في لوحة المدير */

function renderAppSelector() {

  $("appSelector").innerHTML = `

    <label>
      التطبيق
    </label>

    <select id="selectedAppSelect">

      ${apps.map(app => `

        <option
          value="${app.id}"
          ${app.id === selectedAppId ? "selected" : ""}>

          ${app.name}

        </option>

      `).join("")}

    </select>

  `;


  $("selectedAppSelect").onchange =
    () => {

      selectApp(
        $("selectedAppSelect")
          .value
      );

    };

}


/* حفظ التطبيقات */

$("saveApps").onclick =
  async () => {

    try {

      await setDoc(
        doc(
          db,
          "settings",
          "apps"
        ),
        {
          items: apps
        }
      );


      renderApps();

      renderAppSelector();


      alert(
        "تم حفظ التطبيقات بنجاح."
      );

    } catch (error) {

      console.error(error);

      alert(
        "حدث خطأ أثناء الحفظ."
      );

    }

  };


/* حفظ رقم فودافون */

$("saveStore").onclick =
  async () => {

    try {

      await setDoc(
        doc(
          db,
          "settings",
          "store"
        ),
        {

          vodafoneCash:
            $("cashNumber")
              .value
              .trim()

        },
        {
          merge: true
        }
      );


      $("storeMsg").textContent =
        "تم الحفظ ✓";


    } catch (error) {

      console.error(error);

      $("storeMsg").textContent =
        "حدث خطأ أثناء الحفظ.";

    }

  };


/* تحميل أسعار التطبيق */

async function selectApp(id) {

  selectedAppId =
    id;


  const snapshot =
    await getDoc(
      doc(
        db,
        "apps",
        id
      )
    );


  packages =
    snapshot.exists() &&
    Array.isArray(
      snapshot.data().packages
    )
      ? snapshot.data().packages
      : [];


  renderPrices();

}


/* عرض الأسعار */

function renderPrices() {

  $("prices").innerHTML =
    packages
      .map(
        (pack, index) => {

          return `

            <div
              class="price-row">

              <input
                data-index="${index}"
                data-key="quantity"
                value="${pack.quantity ?? ""}"
                placeholder="الكمية">


              <input
                data-index="${index}"
                data-key="price"
                type="number"
                min="0"
                value="${pack.price ?? ""}"
                placeholder="السعر">


              <button
                data-delete="${index}">

                حذف

              </button>

            </div>

          `;

        }
      )
      .join("");


  /*
   تعديل مباشر
  */

  document
    .querySelectorAll(
      "#prices input"
    )
    .forEach(input => {

      input.oninput =
        () => {

          const index =
            Number(
              input.dataset.index
            );


          const key =
            input.dataset.key;


          packages[index][key] =
            key === "price"
              ? Number(input.value)
              : input.value;

        };

    });


  /*
   حذف
  */

  document
    .querySelectorAll(
      "[data-delete]"
    )
    .forEach(button => {

      button.onclick =
        () => {

          const index =
            Number(
              button.dataset.delete
            );


          packages.splice(
            index,
            1
          );


          renderPrices();

        };

    });

}


/* إضافة باقة */

$("addPrice").onclick =
  () => {

    packages.push({

      quantity: "",

      price: 0

    });


    renderPrices();

  };


/* حفظ الأسعار */

$("savePrices").onclick =
  async () => {

    try {

      await setDoc(

        doc(
          db,
          "apps",
          selectedAppId
        ),

        {
          packages:
            packages
        }

      );


      $("priceMsg").textContent =
        "تم حفظ الأسعار ✓";


      setTimeout(
        () => {

          $("priceMsg")
            .textContent = "";

        },
        1800
      );


    } catch (error) {

      console.error(error);

      $("priceMsg").textContent =
        "حدث خطأ أثناء الحفظ.";

    }

  };


/* الطلبات */

function listenOrders() {

  const ordersQuery =
    query(

      collection(
        db,
        "orders"
      ),

      orderBy(
        "createdAt",
        "desc"
      )

    );


  onSnapshot(
    ordersQuery,
    snapshot => {

      const pending =
        snapshot.docs
          .filter(
            doc =>
              doc.data().status ===
              "pending"
          )
          .length;


      $("orderCount")
        .textContent =
        pending;


      $("orders").innerHTML =
        snapshot.docs
          .map(
            document => {

              const order =
                document.data();


              let time = "";


              if (
                order.createdAt &&
                order.createdAt.toDate
              ) {

                time =
                  order.createdAt
                    .toDate()
                    .toLocaleString(
                      "ar-EG"
                    );

              }


              return `

                <article
                  class="order">


                  <div
                    class="order-grid">


                    <div>

                      التطبيق:

                      <b>
                        ${escapeHTML(
                          order.appName
                        )}
                      </b>

                    </div>


                    <div>

                      الكمية:

                      <b>
                        ${escapeHTML(
                          order.quantity
                        )}
                      </b>

                    </div>


                    <div>

                      المبلغ:

                      <b>
                        ${Number(
                          order.amount || 0
                        ).toLocaleString(
                          "ar-EG"
                        )}

                        جنيه
                      </b>

                    </div>


                    <div>

                      رقم المحول:

                      <b>
                        ${escapeHTML(
                          order.senderPhone
                        )}
                      </b>

                    </div>


                    <div>

                      ID العميل:

                      <b>
                        ${escapeHTML(
                          order.customerId
                        )}
                      </b>

                    </div>


                    <div>

                      الحالة:

                      <b>
                        ${escapeHTML(
                          order.status
                        )}
                      </b>

                    </div>


                    <div>

                      الوقت:

                      ${escapeHTML(
                        time
                      )}

                    </div>


                  </div>


                  ${
                    order.receiptUrl
                      ?

                    `

                      <a
                        href="${order.receiptUrl}"
                        target="_blank"
                        rel="noopener">

                        <img
                          class="receipt"
                          src="${order.receiptUrl}"
                          alt="إشعار التحويل">

                      </a>

                    `

                      : ""
                  }


                  ${
                    order.status ===
                    "pending"

                    ?

                    `

                      <br>

                      <button
                        class="ship"
                        data-ship="${document.id}">

                        تم الشحن ✓

                      </button>

                    `

                    : ""
                  }


                </article>

              `;

            }
          )
          .join("");


      /*
       أزرار تم الشحن
      */

      document
        .querySelectorAll(
          "[data-ship]"
        )
        .forEach(button => {

          button.onclick =
            async () => {

              try {

                await updateDoc(

                  doc(
                    db,
                    "orders",
                    button.dataset.ship
                  ),

                  {

                    status:
                      "shipped",

                    shippedAt:
                      new Date()

                  }

                );

              } catch (error) {

                console.error(error);

                alert(
                  "حدث خطأ أثناء تحديث الطلب."
                );

              }

            };

        });


      if (
        !snapshot.docs.length
      ) {

        $("orders").innerHTML = `

          <p class="muted">

            لا توجد طلبات حالياً.

          </p>

        `;

      }

    }
  );

}


/* حماية عرض النصوص */

function escapeHTML(
  value = ""
) {

  return String(value)
    .replace(
      /[&<>"']/g,
      character => {

        return {

          "&":
            "&amp;",

          "<":
            "&lt;",

          ">":
            "&gt;",

          '"':
            "&quot;",

          "'":
            "&#039;"

        }[character];

      }
    );

}
