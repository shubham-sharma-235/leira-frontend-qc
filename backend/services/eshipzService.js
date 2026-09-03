const ONLINE_PAYMENT_CODE = 'PREPAID';
const COD_PAYMENT_CODE = 'COD';
const DEFAULT_COUNTRY_CODE = 'IN';

function hasConfig() {
  return !!(
    process.env.ESHIPZ_API_TOKEN &&
    process.env.ESHIPZ_VENDOR_ID &&
    (process.env.ESHIPZ_ORDER_ENDPOINT || process.env.ESHIPZ_SHIPMENT_ENDPOINT)
  );
}

function sanitizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function toSafeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeCountryCode(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return DEFAULT_COUNTRY_CODE;
  if (raw.length === 2) return raw;
  if (raw === 'INDIA') return 'IN';
  return raw;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function toEshipzDateTime(value) {
  const d = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  }
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function extractExternalOrderId(payload) {
  if (!payload || typeof payload !== 'object') return '';
  const firstData =
    Array.isArray(payload.data) && payload.data.length > 0
      ? payload.data[0]
      : payload.data?.data || payload.data;
  return (
    payload.order_id ||
    payload.orderId ||
    payload.shipment_id ||
    payload.shipmentId ||
    payload.awb ||
    firstData?.order_id ||
    firstData?.orderId ||
    firstData?.shipment_id ||
    firstData?.shipmentId ||
    firstData?.awb ||
    payload.data?.order_id ||
    payload.data?.orderId ||
    payload.data?.data?.order_id ||
    payload.data?.data?.orderId ||
    payload.data?.shipment_id ||
    payload.data?.shipmentId ||
    payload.data?.awb ||
    ''
  );
}

function stringifySafe(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeText(value) {
  return String(value || '').trim();
}

function isDuplicateCustomerReferenceError(text) {
  const normalized = normalizeText(text).toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('same customer reference') &&
    normalized.includes('already been processed')
  );
}

function extractReferenceFromText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return '';
  // Example: "... already been processed ... on 80035335252"
  const match = normalized.match(/\bon\s+([A-Za-z0-9_-]{6,})\b/i);
  if (match && match[1]) return match[1];
  const fallback = normalized.match(/\b([A-Za-z0-9_-]{8,})\b/g);
  return fallback && fallback.length ? fallback[fallback.length - 1] : '';
}

function buildOrderPushPayload(order) {
  const shipping = order.shippingAddress || {};
  const billing = order.billingAddress || {};
  const customer = order.customer || {};
  const itemWeightKg = toSafeNumber(process.env.ESHIPZ_DEFAULT_ITEM_WEIGHT_KG, 0.25);
  const isCod = order.paymentMethod === 'cod';
  const customerName = String(customer.name || '').trim();
  const customerEmail = String(customer.email || '').trim();
  const customerPhone = sanitizePhone(customer.phone) || '9999999999';
  const shippingAddressLine1 = String(shipping.address || billing.address || '').trim();
  const shippingCity = String(shipping.city || billing.city || '').trim();
  const shippingState = String(shipping.state || billing.state || '').trim();
  const shippingPincode = String(shipping.pincode || billing.pincode || '').trim();
  const shippingCountry = normalizeCountryCode(process.env.ESHIPZ_DEFAULT_COUNTRY || 'IN');
  const orderId = order.orderNumber || String(order._id);
  const orderCurrency = process.env.ESHIPZ_CURRENCY || 'INR';
  const dimLength = toSafeNumber(process.env.ESHIPZ_DIMENSION_LENGTH_CM, 10);
  const dimWidth = toSafeNumber(process.env.ESHIPZ_DIMENSION_WIDTH_CM, 10);
  const dimHeight = toSafeNumber(process.env.ESHIPZ_DIMENSION_HEIGHT_CM, 5);
  const receiverFirstName = customerName.split(/\s+/)[0] || 'Customer';
  const receiverLastName = customerName.includes(' ')
    ? customerName.split(/\s+/).slice(1).join(' ')
    : '';
  const createdDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const isoDate = createdDate.toISOString().slice(0, 10);
  const totalAmount = Math.max(0.01, toSafeNumber(order.total, 0.01));
  const totalUnits = Math.max(
    1,
    (order.items || []).reduce(
      (sum, item) => sum + Math.max(1, toSafeNumber(item.quantity, 1)),
      0
    )
  );
  const totalWeight = Number((totalUnits * itemWeightKg).toFixed(3));
  const orderItems = (order.items || []).map((item) => {
    const quantity = Math.max(1, toSafeNumber(item.quantity, 1));
    const lineAmount = Math.max(0.01, toSafeNumber(item.price, 0.01) * quantity);
    return {
      description: item.name || 'Item',
      quantity,
      weight: {
        unit_of_measurement: 'kg',
        value: Number((itemWeightKg * quantity).toFixed(3)),
      },
      dimensions: {
        unit_of_measurement: 'cms',
        length: dimLength,
        width: dimWidth,
        height: dimHeight,
        irregular_parcel_girth: '',
      },
      value: {
        currency: orderCurrency,
        amount: Number(lineAmount.toFixed(2)),
      },
      sku: String(item.product || item.name || '').slice(0, 64),
      hs_code: process.env.ESHIPZ_DEFAULT_HSN || '',
    };
  });

  return {
    data: [
      {
        order_id: orderId,
        store_name: process.env.ESHIPZ_STORE_NAME || 'other',
        store_id: process.env.ESHIPZ_STORE_ID || 'other',
        shopify_order_id: '',
        order_created_on: toEshipzDateTime(createdDate),
        is_cod: isCod,
        shipment_value: Number(totalAmount.toFixed(2)),
        order_currency: orderCurrency,
        cod_amount: isCod ? Number(totalAmount.toFixed(2)) : 0,
        order_status: 'processing',
        shipment_type: 'Parcel',
        receiver_address: {
          first_name: receiverFirstName,
          last_name: receiverLastName,
          company_name: '',
          address: shippingAddressLine1,
          city: shippingCity,
          state: shippingState,
          country: shippingCountry,
          zipcode: shippingPincode,
          landmark: '',
          gst_number: '',
          phone: customerPhone,
          email: customerEmail,
        },
        items: orderItems,
        is_mps: false,
        parcels: [
          {
            quantity: 1,
            weight: {
              unit_of_measurement: 'kg',
              value: totalWeight,
            },
            dimensions: {
              unit_of_measurement: 'cm',
              length: dimLength,
              width: dimWidth,
              height: dimHeight,
            },
          },
        ],
        invoice_number: orderId,
        trip_id: '',
        po_number: '',
        gst_invoices: [
          {
            invoice_number: orderId,
            invoice_date: isoDate,
            invoice_link: '',
            invoice_value: Number(totalAmount.toFixed(2)),
            ewaybill_number: '',
            ewaybill_date: '',
            ewaybill_link: '',
          },
        ],
        is_appt_based_delivery: false,
      },
    ],
  };
}

function buildShipmentCreatePayload(order) {
  const shipping = order.shippingAddress || {};
  const billing = order.billingAddress || {};
  const customer = order.customer || {};
  const itemWeightKg = toSafeNumber(process.env.ESHIPZ_DEFAULT_ITEM_WEIGHT_KG, 0.25);
  const isCod = order.paymentMethod === 'cod';
  const serviceType = isCod
    ? (process.env.ESHIPZ_SERVICE_TYPE_COD || 'Dart_Plus_COD')
    : (process.env.ESHIPZ_SERVICE_TYPE_PREPAID || 'Dart_Plus_Prepaid');
  const slug = process.env.ESHIPZ_SLUG || 'bluedart';

  const customerName = String(customer.name || '').trim() || 'Customer';
  const customerEmail = String(customer.email || '').trim() || 'support@leiraindia.com';
  const customerPhone = sanitizePhone(customer.phone) || '9999999999';
  const shippingAddressLine1 = String(shipping.address || billing.address || '').trim();
  const shippingCity = String(shipping.city || billing.city || '').trim();
  const shippingState = String(shipping.state || billing.state || '').trim();
  const shippingPincode = String(shipping.pincode || billing.pincode || '').trim();
  const shippingCountry = normalizeCountryCode(process.env.ESHIPZ_DEFAULT_COUNTRY || 'IN');
  const orderTotal = Math.max(0.01, toSafeNumber(order.total, 0.01));
  const totalUnits = Math.max(
    1,
    (order.items || []).reduce(
      (sum, item) => sum + Math.max(1, toSafeNumber(item.quantity, 1)),
      0
    )
  );
  const chargedWeightKg = Number((totalUnits * itemWeightKg).toFixed(3));

  const fromAddress = {
    type: 'business',
    company_name:
      process.env.ESHIPZ_SHIP_FROM_COMPANY || 'AOMAN SERVICES PRIVATE LIMITED',
    contact_name: process.env.ESHIPZ_SHIP_FROM_CONTACT || 'Leira Support',
    phone: sanitizePhone(process.env.ESHIPZ_SHIP_FROM_PHONE || '') || '9211227024',
    email: process.env.ESHIPZ_SHIP_FROM_EMAIL || 'admin@leira.in',
    street1:
      process.env.ESHIPZ_SHIP_FROM_STREET1 ||
      'Office No. 48, 7th Floor, ETT Tower 2, Sector 132',
    city: process.env.ESHIPZ_SHIP_FROM_CITY || 'Noida',
    state: process.env.ESHIPZ_SHIP_FROM_STATE || 'Uttar Pradesh',
    postal_code: process.env.ESHIPZ_SHIP_FROM_PINCODE || '201304',
    country: normalizeCountryCode(process.env.ESHIPZ_SHIP_FROM_COUNTRY || shippingCountry),
    tax_id: process.env.ESHIPZ_SHIP_FROM_TAX_ID || '',
    lat: '',
    lng: '',
    what3words: '',
    id: '',
  };

  return {
    vendor_id: process.env.ESHIPZ_VENDOR_ID,
    slug,
    service_type: serviceType,
    customer_reference: order.orderNumber || String(order._id),
    order_source: process.env.ESHIPZ_ORDER_SOURCE || 'manual',
    purpose: process.env.ESHIPZ_PURPOSE || 'commercial',
    description: process.env.ESHIPZ_DEFAULT_DESCRIPTION || 'Leira intimate care order',
    is_document: false,
    parcel_contents: process.env.ESHIPZ_PARCEL_CONTENTS || 'beauty products',
    charged_weight: {
      unit: process.env.ESHIPZ_WEIGHT_UNIT_UPPER || 'KG',
      value: chargedWeightKg,
    },
    invoice_number: order.orderNumber || String(order._id),
    invoice_date: new Date(order.createdAt || Date.now()).toISOString(),
    billing: { paid_by: process.env.ESHIPZ_BILLING_PAID_BY || 'shipper' },
    is_cod: isCod,
    collect_on_delivery: {
      currency: process.env.ESHIPZ_CURRENCY || 'INR',
      amount: isCod ? orderTotal : 0,
    },
    shipment: {
      ship_from: fromAddress,
      return_to: fromAddress,
      ship_to: {
        type: 'residential',
        contact_name: customerName,
        company_name: '',
        phone: customerPhone,
        email: customerEmail,
        street1: shippingAddressLine1,
        street2: '',
        city: shippingCity,
        state: shippingState,
        postal_code: shippingPincode,
        country: shippingCountry,
        lat: '',
        lng: '',
        what3words: '',
        id: '',
      },
      parcels: (order.items || []).map((item) => ({
        description: item.name || 'Item',
        box_type: process.env.ESHIPZ_BOX_TYPE || 'custom',
        quantity: Math.max(1, toSafeNumber(item.quantity, 1)),
        weight: {
          value: Number((Math.max(1, toSafeNumber(item.quantity, 1)) * itemWeightKg).toFixed(3)),
          unit: process.env.ESHIPZ_WEIGHT_UNIT || 'kg',
        },
        dimension: {
          length: toSafeNumber(process.env.ESHIPZ_DIMENSION_LENGTH_CM, 10),
          width: toSafeNumber(process.env.ESHIPZ_DIMENSION_WIDTH_CM, 10),
          height: toSafeNumber(process.env.ESHIPZ_DIMENSION_HEIGHT_CM, 5),
          unit: process.env.ESHIPZ_DIMENSION_UNIT || 'cm',
        },
        items: [
          {
            description: item.name || 'Item',
            origin_country: shippingCountry,
            sku: String(item.product || item.name || '').slice(0, 64),
            hs_code: process.env.ESHIPZ_DEFAULT_HSN || '',
            variant: '',
            quantity: Math.max(1, toSafeNumber(item.quantity, 1)),
            price: {
              amount: Math.max(0.01, toSafeNumber(item.price, 0.01)),
              currency: process.env.ESHIPZ_CURRENCY || 'INR',
            },
            weight: {
              value: toSafeNumber(itemWeightKg, 0.25),
              unit: process.env.ESHIPZ_WEIGHT_UNIT || 'kg',
            },
          },
        ],
      })),
    },
    gst_invoices: [
      {
        invoice_number: order.orderNumber || String(order._id),
        invoice_date: new Date(order.createdAt || Date.now()).toISOString(),
        invoice_value: orderTotal,
        ewaybill_number: '',
        ewaybill_date: '',
      },
    ],
  };
}

function getEshipzEndpoints() {
  const includeOrderPush = String(process.env.ESHIPZ_ENABLE_ORDER_PUSH || 'true').toLowerCase() === 'true';
  const endpoints = [
    ...(includeOrderPush ? [process.env.ESHIPZ_ORDER_ENDPOINT || ''] : []),
    process.env.ESHIPZ_SHIPMENT_ENDPOINT || '',
  ]
    .map((v) => String(v).trim())
    .filter(Boolean);
  return Array.from(new Set(endpoints));
}

async function callEshipz(order) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available in this Node.js runtime');
  }

  const endpoints = getEshipzEndpoints();
  if (!endpoints.length) {
    throw new Error('eShipz endpoint is not configured');
  }

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-API-TOKEN': String(process.env.ESHIPZ_API_TOKEN || '').trim(),
  };
  if (!headers['X-API-TOKEN']) {
    throw new Error('eShipz API token is missing');
  }

  const endpointErrors = [];
  for (const endpoint of endpoints) {
    try {
      const isShipmentEndpoint = endpoint.includes('/create-shipments');
      const endpointPayload = isShipmentEndpoint
        ? buildShipmentCreatePayload(order)
        : buildOrderPushPayload(order);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(endpointPayload),
      });

      const rawText = await res.text();
      let parsed;
      try {
        parsed = rawText ? JSON.parse(rawText) : {};
      } catch {
        parsed = { message: rawText || '' };
      }

      const normalizedStatus = String(parsed?.status || parsed?.Status || '').toLowerCase();
      const metaCode = Number(parsed?.meta?.code || 0);
      const metaStatus = String(parsed?.meta?.status || '').toLowerCase();
      const explicitFailure =
        parsed?.success === false ||
        ['error', 'failed', 'failure'].includes(normalizedStatus) ||
        (Number.isFinite(metaCode) && metaCode >= 400) ||
        ['error', 'failed', 'failure'].includes(metaStatus) ||
        !!parsed?.error ||
        !!parsed?.errors ||
        !!parsed?.meta?.details;
      const successByFlag = parsed?.success === true;
      const successByStatus = ['success', 'ok', 'created'].includes(normalizedStatus);
      const successByMetaCode = Number.isFinite(metaCode) && metaCode > 0 && metaCode < 300;
      const externalOrderId = extractExternalOrderId(parsed);
      const combinedMessage = [
        stringifySafe(parsed?.message),
        stringifySafe(parsed?.error),
        stringifySafe(parsed?.meta?.details),
        stringifySafe(parsed?.Details),
        rawText,
      ]
        .filter(Boolean)
        .join(' | ');
      const duplicateCustomerReference = isDuplicateCustomerReferenceError(combinedMessage);
      const successful = res.ok && !explicitFailure && (successByFlag || successByStatus || successByMetaCode || !!externalOrderId);
      if (duplicateCustomerReference) {
        return {
          externalOrderId:
            externalOrderId ||
            extractReferenceFromText(combinedMessage) ||
            String(endpointPayload?.customer_reference || order.orderNumber || order._id || ''),
          response: parsed,
        };
      }
      if (!successful) {
        const fallbackPayload =
          parsed && typeof parsed === 'object'
            ? JSON.stringify(parsed).slice(0, 300)
            : String(rawText || '').slice(0, 300);
        const message =
          stringifySafe(parsed?.message) ||
          stringifySafe(parsed?.error) ||
          stringifySafe(parsed?.meta?.details) ||
          stringifySafe(parsed?.Details) ||
          (fallbackPayload ? `${res.status} ${res.statusText || 'eShipz request failed'} - ${fallbackPayload}` : `${res.status} ${res.statusText || 'eShipz request failed'}`);
        endpointErrors.push(`${endpoint}: ${String(message)}`);
        continue;
      }

      // If API says success but does not return any tracking/order reference, avoid false "synced".
      if (!externalOrderId) {
        if (!isShipmentEndpoint) {
          const pushOrderId =
            endpointPayload?.data?.[0]?.order_id ||
            endpointPayload?.order_number ||
            order.orderNumber ||
            order._id;
          return {
            externalOrderId: String(pushOrderId || ''),
            response: parsed,
          };
        }
        endpointErrors.push(`${endpoint}: eShipz did not return order reference`);
        continue;
      }

      return {
        externalOrderId,
        response: parsed,
      };
    } catch (err) {
      endpointErrors.push(`${endpoint}: ${err.message || 'Request failed'}`);
    }
  }

  throw new Error(endpointErrors.join(' | ') || 'All eShipz endpoints failed');
}

async function attemptEshipzSync(order, { force = false } = {}) {
  if (!order) {
    return { synced: false, skipped: true, reason: 'Order not found' };
  }

  if (!hasConfig()) {
    order.eshipz = {
      ...(order.eshipz || {}),
      syncStatus: 'skipped',
      lastError: 'eShipz configuration is missing',
    };
    await order.save();
    return { synced: false, skipped: true, reason: 'Missing configuration' };
  }

  if (!force && order.eshipz?.syncStatus === 'synced') {
    return { synced: true, skipped: true, reason: 'Already synced' };
  }

  const nextAttempts = Math.max(0, Number(order.eshipz?.attempts || 0)) + 1;
  order.eshipz = {
    ...(order.eshipz || {}),
    syncStatus: 'pending',
    attempts: nextAttempts,
    lastError: '',
  };
  await order.save();

  try {
    const { externalOrderId } = await callEshipz(order);
    order.eshipz = {
      ...(order.eshipz || {}),
      syncStatus: 'synced',
      attempts: nextAttempts,
      externalOrderId: externalOrderId || '',
      lastSyncedAt: new Date(),
      lastError: '',
    };
    await order.save();
    return { synced: true, skipped: false };
  } catch (error) {
    order.eshipz = {
      ...(order.eshipz || {}),
      syncStatus: 'failed',
      attempts: nextAttempts,
      lastError: error.message || 'eShipz sync failed',
    };
    await order.save();
    return { synced: false, skipped: false, error: error.message };
  }
}

module.exports = {
  hasConfig,
  attemptEshipzSync,
};
