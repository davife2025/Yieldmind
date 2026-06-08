import { NextResponse } from "next/server"

// GET /api/bybit/prices
// Returns live ETH + BTC prices from Bybit for the dashboard
// Called client-side every 30s for price display

const BYBIT_BASE = process.env.BYBIT_BASE_URL ?? "https://api-testnet.bybit.com"

export async function GET() {
  try {
    const [ethRes, btcRes] = await Promise.all([
      fetch(`${BYBIT_BASE}/v5/market/tickers?category=linear&symbol=ETHUSDT`, {
        next: { revalidate: 30 }, // cache 30s
      }),
      fetch(`${BYBIT_BASE}/v5/market/tickers?category=linear&symbol=BTCUSDT`, {
        next: { revalidate: 30 },
      }),
    ])

    const [ethData, btcData] = await Promise.all([ethRes.json(), btcRes.json()])

    const ethItem = ethData?.result?.list?.[0]
    const btcItem = btcData?.result?.list?.[0]

    return NextResponse.json({
      ETH: {
        price:       parseFloat(ethItem?.lastPrice   ?? "3524.10"),
        change24h:   parseFloat(ethItem?.price24hPcnt ?? "0"),
        fundingRate: parseFloat(ethItem?.fundingRate  ?? "0.01"),
      },
      BTC: {
        price:       parseFloat(btcItem?.lastPrice   ?? "61130.00"),
        change24h:   parseFloat(btcItem?.price24hPcnt ?? "0"),
        fundingRate: parseFloat(btcItem?.fundingRate  ?? "0.01"),
      },
      fetchedAt: new Date().toISOString(),
    })
  } catch (err: unknown) {
    // Return static fallback so UI never breaks
    return NextResponse.json({
      ETH: { price: 3524.10, change24h: 0.011, fundingRate: 0.0001 },
      BTC: { price: 61130.00, change24h: 0.022, fundingRate: 0.0001 },
      fetchedAt: new Date().toISOString(),
      fallback: true,
    })
  }
}
