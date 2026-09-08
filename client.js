import {
  auth,
  db,
  storage
} from "./firebase-config.js";

import {
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";


/* التطبيقات الافتراضية */

const fallbackApps = [

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


let apps = fallbackApps;

let selectedApp = null;

let selectedPackage = null;

let store = {

  vodafoneCash:
    "01000000000"

};


/* اختصار */

const $ = id =>
  document.getElementById(id);


/* تنسيق السعر */

function money(number) {

  return Number(number)
    .toLocaleString("ar-EG")
    + " جنيه";

}


/* تحميل إعدادات المتجر */

async function loadStore() {

  try {

    const snapshot =
      await getDoc(
        doc(
          db,
          "settings",
          "store"
        )
      );


    if (
      snapshot.exists()
    ) {

      store = {
        ...store,
        ...snapshot.data()
      };

    }

  } catch (error) {

    console.warn(error);

  }


  $("cashNumber").textContent =
    store.vodafoneCash ||
    "غير متاح";

}


/* تحميل التطبيقات */

async function loadApps() {

  try {

    const snapshot =
      await getDoc(
        doc(
          db,
          "settings",
          "apps"
        )
      );


    if (
      snapshot.exists() &&
      Array.isArray(
        snapshot.data().items
      )
    ) {

      apps =
        snapshot.data().items;

    }

  } catch (error) {

    console.warn(error);

  }


  $("apps").innerHTML =
    apps
      .map(app => {

        return `

          <button
            class="app"
            data-id="${app.id}"
            type="button">

            <div class="app-icon">
              ${app.icon || "★"}
            </div>

            <b>
              ${app.name}
            </b>

          </button>

        `;

      })
      .join("");


  document
    .querySelectorAll(".app")
    .forEach(button => {

      button.onclick = () => {

        selectApp(
          button.dataset.id
        );

      };

    });

}


/* اختيار التطبيق */

async function selectApp(id) {

  selectedApp =
    apps.find(
      app => app.id === id
    );


  selectedPackage = null;


  document
    .querySelectorAll(".app")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.id === id
      );

    });


  $("selectedApp").textContent =
    selectedApp.name;


  $("packages").innerHTML = `
    <div style="color:#9eafc4">
      جارٍ تحميل الأسعار...
    </div>
  `;


  $("packagesSection")
    .classList
    .remove("hidden");


  $("paymentSection")
    .classList
    .add("hidden");


  $("formSection")
    .classList
    .add("hidden");


  try {

    const snapshot =
      await getDoc(
        doc(
          db,
          "apps",
          id
        )
      );


    const packages =
      snapshot.exists() &&
      Array.isArray(
        snapshot.data().packages
      )
        ? snapshot.data().packages
        : [];


    if (!packages.length) {

      $("packages").innerHTML = `
        <div style="color:#ffbf8b">
          لا توجد باقات متاحة حالياً.
        </div>
      `;

      return;

    }


    $("packages").innerHTML =
      packages
        .map((pack, index) => {

          return `

            <button
              class="package"
              data-index="${index}"
              type="button">

              <strong>
                ${pack.quantity}
              </strong>

              <span>
                ${money(pack.price)}
              </span>

            </button>

          `;

        })
        .join("");


    document
      .querySelectorAll(".package")
      .forEach(button => {

        button.onclick = () => {

          selectPackage(
            packages[
              Number(
                button.dataset.index
              )
            ],
            button
          );

        };

      });


  } catch (error) {

    console.error(error);

    $("packages").innerHTML = `
      <div style="color:#ff9c9c">
        تعذر تحميل الأسعار.
      </div>
    `;

  }

}


/* اختيار الباقة */

function selectPackage(
  pack,
  element
) {

  selectedPackage = pack;


  document
    .querySelectorAll(".package")
    .forEach(button => {

      button.classList.remove(
        "active"
      );

    });


  element.classList.add(
    "active"
  );


  $("amountText").textContent =
    money(pack.price);


  $("paymentSection")
    .classList
    .remove("hidden");


  $("formSection")
    .classList
    .remove("hidden");


  $("formSection")
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

}


/* نسخ رقم فودافون */

$("copyCash").onclick =
  async () => {

    try {

      await navigator
        .clipboard
        .writeText(
          $("cashNumber")
            .textContent
        );


      $("copyCash")
        .textContent =
        "تم النسخ ✓";


      setTimeout(() => {

        $("copyCash")
          .textContent =
          "نسخ الرقم";

      }, 1500);


    } catch (error) {

      alert(
        "لم يتم نسخ الرقم."
      );

    }

  };


/* إرسال الطلب */

$("orderForm").onsubmit =
  async event => {

    event.preventDefault();


    const message =
      $("formMsg");


    const file =
      $("receipt")
        .files[0];


    message.textContent =
      "جارٍ إرسال الطلب...";


    if (
      !selectedApp ||
      !selectedPackage
    ) {

      message.textContent =
        "اختر التطبيق والباقة أولاً.";

      return;

    }


    if (
      !file ||
      file.size >
        5 * 1024 * 1024 ||
      !file.type.startsWith(
        "image/"
      )
    ) {

      message.textContent =
        "اختر صورة صحيحة أقل من 5MB.";

      return;

    }


    try {

      /*
       إنشاء مرجع للطلب
      */

      const orderReference =
        doc(
          collection(
            db,
            "orders"
          )
        );


      /*
       رفع صورة التحويل
      */

      const storageReference =
        ref(
          storage,
          `orders/${orderReference.id}/receipt-${Date.now()}.${file.name.split(".").pop()}`
        );


      await uploadBytes(
        storageReference,
        file,
        {
          contentType:
            file.type
        }
      );


      const receiptUrl =
        await getDownloadURL(
          storageReference
        );


      /*
       حفظ الطلب
      */

      await addDoc(
        collection(
          db,
          "orders"
        ),
        {

          appId:
            selectedApp.id,

          appName:
            selectedApp.name,

          quantity:
            selectedPackage.quantity,

          amount:
            Number(
              selectedPackage.price
            ),

          senderPhone:
            $("senderPhone")
              .value
              .trim(),

          customerId:
            $("customerId")
              .value
              .trim(),

          receiptUrl:
            receiptUrl,

          status:
            "pending",

          createdAt:
            serverTimestamp()

        }
      );


      /*
       إظهار النجاح
      */

      $("orderId")
        .textContent =
        orderReference.id;


      $("success")
        .classList
        .remove("hidden");


      $("formSection")
        .classList
        .add("hidden");


      $("paymentSection")
        .classList
        .add("hidden");


      $("packagesSection")
        .classList
        .add("hidden");


      $("success")
        .scrollIntoView({
          behavior: "smooth"
        });


    } catch (error) {

      console.error(error);

      message.textContent =
        "حدث خطأ أثناء إرسال الطلب. تأكد من إعداد Firebase.";

    }

  };


/* طلب جديد */

$("newOrder").onclick =
  () => {

    location.reload();

  };


/* تشغيل الصفحة */

(async () => {

  try {

    await signInAnonymously(
      auth
    );

  } catch (error) {

    console.warn(
      "Anonymous Auth:",
      error
    );

  }


  await Promise.all([

    loadStore(),

    loadApps()

  ]);

})();
