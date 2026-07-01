import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

type SiteProduct = {
  id: number;
  name: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  category: string;
  product_type: string;
  price_cents: number;
  old_price_cents: number | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  image_url: string | null;
  badge: string | null;
  checkout_provider: string | null;
  external_payment_url: string | null;
  accepts_pix: boolean | null;
  accepts_boleto: boolean | null;
  accepts_card: boolean | null;
  appmax_sku: string | null;
  appmax_product_name: string | null;
  course_id: number | null;
};

type PaymentMethod = "pix" | "boleto" | "card";

type PaymentResult = {
  success: boolean;
  order_access_token?: string | null;
  access_token?: string | null;
  product: SiteProduct;
  order: any;
  appmax: {
    customer_id: string;
    order_id: string;
    payment_id: string | null;
  };
  payment: {
    method: PaymentMethod;
    status: "pending" | "approved" | "cancelled";
    pix: {
      qr_code: string | null;
      copy_paste: string | null;
    };
    boleto: {
      url: string | null;
      barcode: string | null;
      digitable_line: string | null;
    };
    card: {
      last4: string | null;
      brand: string | null;
      installments: number | null;
    };
    raw: any;
  };
};

const categoryLabels: Record<string, string> = {
  assessoria: "Assessoria Mensal",
  "servicos-unicos": "Serviços Únicos",
  sites: "Sites e Landing Pages",
  identidade: "Identidade e Posicionamento",
  academy: "Academy",
};

function formatMoney(cents: number | null | undefined) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function maskCpf(value: string) {
  const numbers = onlyNumbers(value).slice(0, 11);

  return numbers
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function maskPhone(value: string) {
  const numbers = onlyNumbers(value).slice(0, 11);

  if (numbers.length <= 10) {
    return numbers
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return numbers
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function maskCardNumber(value: string) {
  const numbers = onlyNumbers(value).slice(0, 19);

  return numbers.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function maskExpiration(value: string) {
  const numbers = onlyNumbers(value).slice(0, 4);

  if (numbers.length <= 2) return numbers;

  return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
}

function getCategoryLabel(category: string) {
  return categoryLabels[category] || category;
}

function getDeliveryType(product: SiteProduct) {
  if (product.product_type === "subscription") return "Mensal";
  if (product.product_type === "course") return "Acesso vitalício";
  if (product.product_type === "site") return "Projeto único";
  if (product.product_type === "branding") return "Entrega estratégica";
  if (product.product_type === "diagnostic") return "Diagnóstico";
  return "Entrega única";
}

function isAcademyCourseProduct(product: SiteProduct | null) {
  return Boolean(
    product &&
      (product.category === "academy" ||
        product.product_type === "course" ||
        product.course_id)
  );
}

function canRenderImage(value: string | null) {
  if (!value) return false;

  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image")
  );
}

function getInstallmentLabel(cents: number, installments: number) {
  const installmentValue = Math.round(cents / installments);

  if (installments === 1) {
    return `1x de ${formatMoney(cents)}`;
  }

  return `${installments}x de ${formatMoney(installmentValue)}`;
}


const CHECKOUT_CUSTOMER_STORAGE_KEY = "fatorz_checkout_customer";

type SavedCheckoutCustomer = {
  name?: string;
  email?: string;
  phone?: string;
  documentNumber?: string;
};

function readSavedCheckoutCustomer(): SavedCheckoutCustomer | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CHECKOUT_CUSTOMER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCheckoutCustomer(data: SavedCheckoutCustomer) {
  if (typeof window === "undefined") return;

  try {
    const current = readSavedCheckoutCustomer() || {};
    const cleanName = data.name?.trim();
    const cleanEmail = data.email?.trim().toLowerCase();
    const cleanPhone = data.phone ? onlyNumbers(data.phone) : "";
    const cleanDocument = data.documentNumber
      ? onlyNumbers(data.documentNumber)
      : "";

    window.localStorage.setItem(
      CHECKOUT_CUSTOMER_STORAGE_KEY,
      JSON.stringify({
        ...current,
        name: cleanName || current.name || "",
        email: cleanEmail || current.email || "",
        phone: cleanPhone || current.phone || "",
        documentNumber: cleanDocument || current.documentNumber || "",
      })
    );
  } catch {
    // Não trava o checkout se o navegador bloquear localStorage.
  }
}

function getProfileName(profile: any, user: any) {
  return (
    profile?.nome ||
    profile?.name ||
    profile?.full_name ||
    user?.user_metadata?.nome ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    ""
  );
}

function getProfilePhone(profile: any) {
  return profile?.whatsapp || profile?.phone || profile?.telefone || "";
}

function getProfileDocument(profile: any) {
  return profile?.cpf || profile?.document || profile?.document_number || "";
}

function getRequestedPaymentMethod(value: string | null): PaymentMethod | null {
  if (value === "pix" || value === "boleto" || value === "card") return value;
  return null;
}

function productAcceptsPaymentMethod(product: SiteProduct, method: PaymentMethod) {
  if (method === "pix") return Boolean(product.accepts_pix);
  if (method === "boleto") return Boolean(product.accepts_boleto);
  return Boolean(product.accepts_card);
}

function normalizeProductText(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function productNeedsBriefing(product: SiteProduct | null) {
  if (!product) return false;

  const searchable = normalizeProductText(
    [
      product.name,
      product.slug,
      product.category,
      product.product_type,
      product.subtitle,
      product.description,
      product.badge,
    ].join(" ")
  );

  if (product.category === "academy") return false;
  if (product.product_type === "course") return false;
  if (product.product_type === "diagnostic") return false;

  if (searchable.includes("academy")) return false;
  if (searchable.includes("curso")) return false;
  if (searchable.includes("diagnostico")) return false;
  if (searchable.includes("analise de perfil")) return false;
  if (searchable.includes("perfil")) {
    const isProfileDiagnostic =
      searchable.includes("diagnostico") ||
      searchable.includes("diagnostic") ||
      searchable.includes("analise");
    if (isProfileDiagnostic) return false;
  }

  return true;
}

function getPaymentResultOrderId(result: PaymentResult | null) {
  const rawId =
    (result as any)?.site_product_order_id ||
    (result as any)?.order_id ||
    (result as any)?.siteProductOrderId ||
    (result as any)?.orderId ||
    result?.order?.id ||
    result?.order?.site_product_order_id ||
    result?.order?.order_id ||
    result?.order?.siteProductOrderId ||
    result?.order?.orderId ||
    (result as any)?.data?.site_product_order_id ||
    (result as any)?.data?.order?.id ||
    null;

  return rawId ? String(rawId) : "";
}

function getPaymentResultOrderAccessToken(result: PaymentResult | null) {
  const rawToken =
    result?.order_access_token ||
    result?.access_token ||
    result?.order?.order_access_token ||
    result?.order?.access_token ||
    (result as any)?.data?.order_access_token ||
    (result as any)?.data?.access_token ||
    null;

  return rawToken ? String(rawToken) : "";
}

export default function ProductCheckout({ user: userFromApp, profile }: any) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const slug = searchParams.get("slug") || "";
  const requestedMethod = getRequestedPaymentMethod(searchParams.get("method"));

  const [product, setProduct] = useState<SiteProduct | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(userFromApp || null);

  const [loading, setLoading] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");

  const [cardHolderName, setCardHolderName] = useState("");
  const [cardHolderNameEdited, setCardHolderNameEdited] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiration, setCardExpiration] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardInstallments, setCardInstallments] = useState(1);

  const [copied, setCopied] = useState(false);
  const [customerDataLoaded, setCustomerDataLoaded] = useState(false);

  useEffect(() => {
    startPage();
  }, [slug, requestedMethod]);

  useEffect(() => {
    if (!customerDataLoaded) return;

    saveCheckoutCustomer({
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      documentNumber,
    });
  }, [
    customerDataLoaded,
    customerName,
    customerEmail,
    customerPhone,
    documentNumber,
  ]);

  useEffect(() => {
    if (!cardHolderNameEdited) {
      setCardHolderName(customerName);
    }
  }, [cardHolderNameEdited, customerName]);

  async function startPage() {
    setLoading(true);
    setCustomerDataLoaded(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const activeUser = user || userFromApp || null;
    setCurrentUser(activeUser);

    const savedCustomer = readSavedCheckoutCustomer();
    const accountEmail = activeUser?.email || profile?.email || "";
    const profileName = getProfileName(profile, activeUser);
    const profilePhone = getProfilePhone(profile);
    const profileDocument = getProfileDocument(profile);

    const savedName = savedCustomer?.name || "";
    const savedEmail = savedCustomer?.email || "";
    const savedPhone = savedCustomer?.phone || "";
    const savedDocument = savedCustomer?.documentNumber || "";

    const preferredName = profileName || savedName;
    const preferredPhone = profilePhone || savedPhone;
    const preferredDocument = profileDocument || savedDocument;

    setCustomerEmail(accountEmail || savedEmail || "");
    setCustomerName(preferredName || "");
    setCardHolderName(preferredName || "");
    setCardHolderNameEdited(false);
    setCustomerPhone(preferredPhone ? maskPhone(preferredPhone) : "");
    setDocumentNumber(preferredDocument ? maskCpf(preferredDocument) : "");
    setCustomerDataLoaded(true);

    if (!slug) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("site_products")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    setLoading(false);

    if (error || !data) {
      console.log("Erro ao carregar produto:", error);
      setProduct(null);
      return;
    }

    setProduct(data);

    if (isAcademyCourseProduct(data) && !activeUser) {
      navigate(
        `/login?redirectTo=${encodeURIComponent(
          `/checkout/produto?slug=${data.slug}${
            requestedMethod ? `&method=${requestedMethod}` : ""
          }`
        )}`,
        { replace: true }
      );
      return;
    }

    if (requestedMethod && productAcceptsPaymentMethod(data, requestedMethod)) {
      setPaymentMethod(requestedMethod);
      return;
    }

    if (!data.accepts_pix && data.accepts_boleto) {
      setPaymentMethod("boleto");
      return;
    }

    if (!data.accepts_pix && !data.accepts_boleto && data.accepts_card) {
      setPaymentMethod("card");
      return;
    }

    setPaymentMethod("pix");
  }

  const paymentOptions = useMemo(() => {
    if (!product) return [];

    const options: { id: PaymentMethod; label: string; description: string }[] = [];

    if (product.accepts_pix) {
      options.push({
        id: "pix",
        label: "Pix",
        description: "Copia e cola gerado na hora.",
      });
    }

    if (product.accepts_boleto) {
      options.push({
        id: "boleto",
        label: "Boleto",
        description: "Linha digitável e link do boleto.",
      });
    }

    if (product.accepts_card) {
      options.push({
        id: "card",
        label: "Cartão",
        description: "Pagamento com token seguro Appmax.",
      });
    }

    return options;
  }, [product]);

  const maxInstallments = useMemo(() => {
    if (!product) return 1;

    const price = Number(product.price_cents || 0);

    if (price >= 100000) return 12;
    if (price >= 50000) return 10;
    if (price >= 30000) return 6;
    if (price >= 10000) return 4;

    return 3;
  }, [product]);

  const emailLockedByAccount = Boolean(currentUser?.email);

  async function copyToClipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);

      setTimeout(() => setCopied(false), 1800);
    } catch {
      alert("Não consegui copiar automaticamente. Copie manualmente.");
    }
  }

  async function createPayment() {
    if (!product) return;

    if (isAcademyCourseProduct(product) && !currentUser?.id) {
      alert("Entre na sua conta para comprar cursos da FatorZ Academy.");
      navigate(
        `/login?redirectTo=${encodeURIComponent(
          `/checkout/produto?slug=${product.slug}&method=${paymentMethod}`
        )}`
      );
      return;
    }

    const cleanPhone = onlyNumbers(customerPhone);
    const cleanCpf = onlyNumbers(documentNumber);
    const cleanCardNumber = onlyNumbers(cardNumber);
    const cleanCardCvv = onlyNumbers(cardCvv);
    const cleanExpiration = onlyNumbers(cardExpiration);

    if (!customerName.trim()) {
      alert("Informe o nome completo para identificar a compra.");
      return;
    }

    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      alert("Informe um e-mail válido para receber e localizar sua compra.");
      return;
    }

    if (cleanPhone.length < 10) {
      alert("Informe um WhatsApp válido para contato sobre a compra.");
      return;
    }

    if (cleanCpf.length !== 11) {
      alert("Informe um CPF válido para gerar o pagamento com segurança.");
      return;
    }

    if (paymentMethod === "pix" && !product.accepts_pix) {
      alert("Esse produto não aceita Pix.");
      return;
    }

    if (paymentMethod === "boleto" && !product.accepts_boleto) {
      alert("Esse produto não aceita boleto.");
      return;
    }

    if (paymentMethod === "card") {
      if (!product.accepts_card) {
        alert("Esse produto não aceita cartão.");
        return;
      }

      if (!cardHolderName.trim()) {
        alert("Informe o nome impresso no cartão.");
        return;
      }

      if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
        alert("Confira o número do cartão informado.");
        return;
      }

      if (cleanExpiration.length !== 4) {
        alert("Informe a validade do cartão no formato MM/AA.");
        return;
      }

      const month = Number(cleanExpiration.slice(0, 2));
      const year = Number(cleanExpiration.slice(2, 4));

      if (month < 1 || month > 12) {
        alert("Confira o mês de validade do cartão.");
        return;
      }

      if (year < 24 || year > 99) {
        alert("Confira o ano de validade do cartão.");
        return;
      }

      if (cleanCardCvv.length < 3 || cleanCardCvv.length > 4) {
        alert("Informe o CVV do cartão.");
        return;
      }
    }

    setCreatingPayment(true);
    setPaymentResult(null);
    setCopied(false);

    try {
      const cleanExpirationForCard = onlyNumbers(cardExpiration);

      const response = await fetch("/api/create-product-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser?.id || null,
          userEmail: customerEmail.trim(),
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          documentNumber: cleanCpf,
          productSlug: product.slug,
          paymentMethod,
          card:
            paymentMethod === "card"
              ? {
                  holderName: cardHolderName.trim(),
                  number: onlyNumbers(cardNumber),
                  cvv: onlyNumbers(cardCvv),
                  month: Number(cleanExpirationForCard.slice(0, 2)),
                  year: Number(cleanExpirationForCard.slice(2, 4)),
                  installments: cardInstallments,
                }
              : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.log("Erro pagamento produto:", data);

        let details = "";

        try {
          const parsedDetails =
            typeof data?.details === "string" ? JSON.parse(data.details) : null;
          details = parsedDetails?.response?.text
            ? `\n\nDetalhe Appmax: ${parsedDetails.response.text}`
            : "";
        } catch {
          details =
            typeof data?.details === "string"
              ? `\n\n${data.details}`
              : data?.details?.message
                ? `\n\n${data.details.message}`
                : "";
        }

        alert(
          (data?.error ||
            "Não foi possível criar o pagamento agora. Confira os dados e tente novamente.") +
            details
        );
        setCreatingPayment(false);
        return;
      }

      const orderId = getPaymentResultOrderId(data);
      const orderAccessToken = getPaymentResultOrderAccessToken(data);

      if (orderId && orderAccessToken) {
        navigate(
          `/obrigado?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(
            orderAccessToken
          )}`
        );
        return;
      }

      if (orderId && !orderAccessToken) {
        alert(
          "Pagamento criado, mas não recebemos o token seguro para abrir a página de obrigado. Confira os dados do pagamento abaixo ou acesse pelo Hub."
        );
        setPaymentResult(data);
        return;
      }

      setPaymentResult(data);
    } catch (error) {
      console.log("Erro inesperado ao criar pagamento:", error);
      alert(
        "Não foi possível conectar ao gateway de pagamento. Tente novamente em instantes."
      );
    } finally {
      setCreatingPayment(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050506] text-white flex items-center justify-center px-4">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-3xl font-black">Carregando checkout...</h1>
          <p className="mt-3 text-zinc-400">Buscando produto na FatorZ.</p>
        </div>
      </div>
    );
  }

  if (!slug || !product) {
    return (
      <div className="min-h-screen bg-[#050506] text-white flex items-center justify-center px-4">
        <div className="max-w-lg rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-3xl font-black">Produto não encontrado</h1>

          <p className="mt-3 text-zinc-400">
            Esse produto não existe, está oculto ou o link está errado.
          </p>

          <button
            onClick={() => navigate("/")}
            className="mt-6 rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200"
          >
            Voltar para a FatorZ
          </button>
        </div>
      </div>
    );
  }

  if (product.checkout_provider === "manual") {
    return (
      <div className="min-h-screen bg-[#050506] text-white flex items-center justify-center px-4">
        <div className="max-w-lg rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-3xl font-black">{product.name}</h1>

          <p className="mt-3 text-zinc-400">
            Esse produto está configurado para atendimento manual.
          </p>

          <button
            onClick={() =>
              window.open("https://www.instagram.com/fatorzhouse/", "_blank")
            }
            className="mt-6 rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90"
          >
            Chamar no Instagram
          </button>
        </div>
      </div>
    );
  }

  if (product.checkout_provider === "external") {
    return (
      <div className="min-h-screen bg-[#050506] text-white flex items-center justify-center px-4">
        <div className="max-w-lg rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-3xl font-black">{product.name}</h1>

          <p className="mt-3 text-zinc-400">
            Esse produto usa um link externo de pagamento.
          </p>

          <button
            onClick={() => {
              if (product.external_payment_url) {
                window.open(product.external_payment_url, "_blank");
              }
            }}
            className="mt-6 rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90"
          >
            Abrir pagamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050506] text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_8%,rgba(0,92,255,0.18),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(255,0,150,0.16),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(145,35,255,0.14),transparent_34%)]" />

      <header className="relative z-10 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <button
            onClick={() => navigate("/")}
            className="text-2xl md:text-3xl font-black tracking-tight text-white"
          >
            Fator<span className="text-pink-500">Z</span>
          </button>

          <button
            onClick={() => navigate("/")}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
          >
            Voltar
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 py-10 md:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:py-16">
        <section className="h-fit rounded-[38px] border border-white/10 bg-black/60 p-6 md:p-8">
          {product.image_url && (
            <div className="mb-6 h-56 overflow-hidden rounded-[28px] border border-white/10 bg-zinc-900">
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="mb-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-pink-500/25 bg-pink-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-pink-300">
              {getCategoryLabel(product.category)}
            </span>

            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black uppercase tracking-widest text-zinc-300">
              {getDeliveryType(product)}
            </span>

            {product.badge && (
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black uppercase tracking-widest text-zinc-300">
                {product.badge}
              </span>
            )}
          </div>

          <h1 className="text-4xl font-black leading-tight md:text-5xl">
            {product.name}
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-zinc-400">
            {product.description ||
              product.subtitle ||
              "Solução FatorZ para organizar sua presença digital."}
          </p>

          <div className="mt-8 rounded-[30px] border border-white/10 bg-white/[0.045] p-6">
            <p className="text-sm font-black uppercase tracking-widest text-zinc-500">
              Valor
            </p>

            <div className="mt-2 flex flex-wrap items-end gap-3">
              {product.old_price_cents && (
                <p className="pb-1 text-lg font-black text-zinc-500 line-through">
                  {formatMoney(product.old_price_cents)}
                </p>
              )}

              <p className="text-4xl font-black text-white">
                {formatMoney(product.price_cents)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="font-black">Compra protegida pela Appmax</p>
              <p className="mt-1 text-sm text-zinc-500">
                O pagamento é gerado pela integração da FatorZ com Appmax.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="font-black">Cartão não fica salvo no Hub</p>
              <p className="mt-1 text-sm text-zinc-500">
                Os dados do cartão são usados apenas para tokenizar e cobrar na
                Appmax. A FatorZ não salva número, validade ou CVV no banco.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[38px] border border-white/10 bg-black/60 p-6 md:p-8">
          <div className="mb-7">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-pink-400">
              Checkout FatorZ
            </p>

            <h2 className="text-3xl font-black md:text-4xl">
              Finalizar compra
            </h2>

            <p className="mt-3 text-zinc-400">
              Informe seus dados uma vez. Eles serão usados para gerar o
              pagamento e localizar sua compra.
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-black text-zinc-300">
                Nome completo
              </label>

              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-black text-zinc-300">
                Email
              </label>

              <input
                value={customerEmail}
                onChange={(event) => {
                  if (!emailLockedByAccount) {
                    setCustomerEmail(event.target.value);
                  }
                }}
                placeholder="seuemail@gmail.com"
                type="email"
                autoComplete="email"
                readOnly={emailLockedByAccount}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
              />
              {emailLockedByAccount && (
                <p className="mt-2 text-xs font-bold text-zinc-500">
                  Compra vinculada ao e-mail da sua conta FatorZ.
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-black text-zinc-300">
                  WhatsApp
                </label>

                <input
                  value={customerPhone}
                  onChange={(event) =>
                    setCustomerPhone(maskPhone(event.target.value))
                  }
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  autoComplete="tel"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-zinc-300">
                  CPF
                </label>

                <input
                  value={documentNumber}
                  onChange={(event) =>
                    setDocumentNumber(maskCpf(event.target.value))
                  }
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  autoComplete="off"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-pink-500/40"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="mb-3 block text-sm font-black text-zinc-300">
                Forma de pagamento
              </label>

              <div className="grid gap-3 md:grid-cols-3">
                {paymentOptions.map((option) => {
                  const active = paymentMethod === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(option.id);
                        setPaymentResult(null);
                      }}
                      className={`rounded-2xl border p-5 text-left transition ${
                        active
                          ? "border-pink-500/45 bg-pink-500/10"
                          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                      }`}
                    >
                      <p className="text-lg font-black">{option.label}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {!paymentOptions.length && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-300">
                  Esse produto não tem Pix, boleto ou cartão ativo.
                </div>
              )}
            </div>

            {paymentMethod === "card" && (
              <div className="mt-2 rounded-[30px] border border-blue-400/20 bg-blue-500/10 p-5">
                <p className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-blue-300">
                  Dados do cartão
                </p>

                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-black text-zinc-300">
                      Nome impresso no cartão
                    </label>

                    <input
                      value={cardHolderName}
                      onChange={(event) => {
                        setCardHolderNameEdited(true);
                        setCardHolderName(event.target.value);
                      }}
                      placeholder="Nome como está no cartão"
                      autoComplete="cc-name"
                      className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-blue-400/50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-black text-zinc-300">
                      Número do cartão
                    </label>

                    <input
                      value={cardNumber}
                      onChange={(event) =>
                        setCardNumber(maskCardNumber(event.target.value))
                      }
                      placeholder="0000 0000 0000 0000"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-blue-400/50"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-black text-zinc-300">
                        Validade
                      </label>

                      <input
                        value={cardExpiration}
                        onChange={(event) =>
                          setCardExpiration(maskExpiration(event.target.value))
                        }
                        placeholder="MM/AA"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-blue-400/50"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-black text-zinc-300">
                        CVV
                      </label>

                      <input
                        value={cardCvv}
                        onChange={(event) =>
                          setCardCvv(onlyNumbers(event.target.value).slice(0, 4))
                        }
                        placeholder="123"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-blue-400/50"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-black text-zinc-300">
                        Parcelas
                      </label>

                      <select
                        value={cardInstallments}
                        onChange={(event) =>
                          setCardInstallments(Number(event.target.value || 1))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-blue-400/50"
                      >
                        {Array.from({ length: maxInstallments }).map((_, index) => {
                          const installment = index + 1;

                          return (
                            <option key={installment} value={installment}>
                              {getInstallmentLabel(
                                product.price_cents,
                                installment
                              )}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-blue-100/80">
                    O número do cartão, validade e CVV não são salvos no banco da
                    FatorZ. Eles são enviados para tokenização e cobrança na
                    Appmax.
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={createPayment}
              disabled={creatingPayment || !paymentOptions.length}
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-5 text-lg font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingPayment
                ? "Gerando pagamento..."
                : paymentMethod === "pix"
                ? "Gerar Pix"
                : paymentMethod === "boleto"
                ? "Gerar Boleto"
                : "Pagar com cartão"}
            </button>
          </div>

          {paymentResult && paymentResult.payment.method === "pix" && (
            <div className="mt-8 rounded-[30px] border border-emerald-400/20 bg-emerald-500/10 p-6">
              <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-emerald-300">
                Pix gerado
              </p>

              <h3 className="text-2xl font-black">Pague usando Pix copia e cola</h3>

              {canRenderImage(paymentResult.payment.pix.qr_code) && (
                <div className="mt-5 flex justify-center">
                  <img
                    src={paymentResult.payment.pix.qr_code || ""}
                    alt="QR Code Pix"
                    className="max-h-64 rounded-2xl border border-white/10 bg-white p-3"
                  />
                </div>
              )}

              {paymentResult.payment.pix.copy_paste ? (
                <>
                  <textarea
                    readOnly
                    value={paymentResult.payment.pix.copy_paste}
                    className="mt-5 h-32 w-full resize-none rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-white outline-none"
                  />

                  <button
                    onClick={() =>
                      copyToClipboard(paymentResult.payment.pix.copy_paste || "")
                    }
                    className="mt-4 w-full rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200"
                  >
                    {copied ? "Copiado!" : "Copiar Pix"}
                  </button>
                </>
              ) : (
                <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-yellow-200">
                  O Pix foi criado, mas a Appmax não retornou o código copia e
                  cola no formato esperado.
                </div>
              )}

              <p className="mt-4 text-sm text-emerald-200/80">
                Pedido Appmax: {paymentResult.appmax.order_id}
              </p>
            </div>
          )}

          {paymentResult && paymentResult.payment.method === "boleto" && (
            <div className="mt-8 rounded-[30px] border border-yellow-400/20 bg-yellow-500/10 p-6">
              <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-yellow-300">
                Boleto gerado
              </p>

              <h3 className="text-2xl font-black">Pague pelo boleto</h3>

              {paymentResult.payment.boleto.digitable_line && (
                <>
                  <p className="mt-5 text-sm font-black text-zinc-300">
                    Linha digitável
                  </p>

                  <textarea
                    readOnly
                    value={paymentResult.payment.boleto.digitable_line}
                    className="mt-2 h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-white outline-none"
                  />

                  <button
                    onClick={() =>
                      copyToClipboard(
                        paymentResult.payment.boleto.digitable_line || ""
                      )
                    }
                    className="mt-4 w-full rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200"
                  >
                    {copied ? "Copiado!" : "Copiar linha digitável"}
                  </button>
                </>
              )}

              {paymentResult.payment.boleto.barcode &&
                !paymentResult.payment.boleto.digitable_line && (
                  <>
                    <p className="mt-5 text-sm font-black text-zinc-300">
                      Código de barras
                    </p>

                    <textarea
                      readOnly
                      value={paymentResult.payment.boleto.barcode}
                      className="mt-2 h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-white outline-none"
                    />

                    <button
                      onClick={() =>
                        copyToClipboard(paymentResult.payment.boleto.barcode || "")
                      }
                      className="mt-4 w-full rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200"
                    >
                      {copied ? "Copiado!" : "Copiar código"}
                    </button>
                  </>
                )}

              {paymentResult.payment.boleto.url && (
                <button
                  onClick={() =>
                    window.open(paymentResult.payment.boleto.url || "", "_blank")
                  }
                  className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90"
                >
                  Abrir boleto
                </button>
              )}

              {!paymentResult.payment.boleto.url &&
                !paymentResult.payment.boleto.barcode &&
                !paymentResult.payment.boleto.digitable_line && (
                  <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-yellow-200">
                    O boleto foi criado, mas a Appmax não retornou o link ou linha
                    digitável no formato esperado.
                  </div>
                )}

              <p className="mt-4 text-sm text-yellow-100/80">
                Pedido Appmax: {paymentResult.appmax.order_id}
              </p>
            </div>
          )}

          {paymentResult && paymentResult.payment.method === "card" && (
            <div
              className={`mt-8 rounded-[30px] border p-6 ${
                paymentResult.payment.status === "approved"
                  ? "border-green-400/20 bg-green-500/10"
                  : paymentResult.payment.status === "cancelled"
                  ? "border-red-400/20 bg-red-500/10"
                  : "border-blue-400/20 bg-blue-500/10"
              }`}
            >
              <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-blue-300">
                Cartão processado
              </p>

              <h3 className="text-2xl font-black">
                {paymentResult.payment.status === "approved"
                  ? "Pagamento aprovado"
                  : paymentResult.payment.status === "cancelled"
                  ? "Pagamento recusado"
                  : "Pagamento em análise"}
              </h3>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-sm text-zinc-500">Final do cartão</p>
                  <p className="mt-1 font-black">
                    {paymentResult.payment.card.last4
                      ? `•••• ${paymentResult.payment.card.last4}`
                      : "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-sm text-zinc-500">Parcelas</p>
                  <p className="mt-1 font-black">
                    {paymentResult.payment.card.installments || 1}x
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-blue-100/80">
                Pedido Appmax: {paymentResult.appmax.order_id}
              </p>

              {paymentResult.payment.status !== "approved" && (
                <p className="mt-3 text-sm text-zinc-400">
                  A Appmax pode atualizar esse pedido por webhook depois da
                  análise/retorno do banco.
                </p>
              )}
            </div>
          )}

          {paymentResult && paymentResult.payment.status !== "cancelled" && productNeedsBriefing(paymentResult.product) && (
            <div className="mt-8 rounded-[30px] border border-pink-500/25 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.16),transparent_38%),rgba(0,0,0,0.45)] p-6">
              <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-pink-300">
                Próximo passo obrigatório
              </p>

              <h3 className="text-2xl font-black">Preencha a ficha de briefing</h3>

              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                Para começarmos sua entrega, precisamos das informações da sua marca:
                Instagram, cores, estilo, referências, objetivo e materiais disponíveis.
                O prazo da produção começa depois do envio dessa ficha.
              </p>

              <button
                onClick={() => {
                  const orderId = getPaymentResultOrderId(paymentResult);

                  if (!orderId) {
                    alert("Pagamento criado, mas não consegui localizar o ID do pedido. Acesse Minhas Entregas para preencher a ficha.");
                    navigate("/minhas-entregas");
                    return;
                  }

                  navigate(`/briefing?orderId=${orderId}`);
                }}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#005cff] via-[#9123ff] to-[#ff0096] px-6 py-4 font-black text-white transition hover:opacity-90"
              >
                Preencher ficha de briefing
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
