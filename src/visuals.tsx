import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { SvgCss } from "react-native-svg/css";
import { Ionicons } from "@expo/vector-icons";
import {
  Account,
  State,
  money,
  totals,
  available,
  balance,
  reserved,
  summary,
  today,
} from "./finance";
import { brands, brandKey } from "./brands";
const logos = require("../assets/brands/logos.json");
export const palette = {
  bg: "#0c1211",
  panel: "#17211e",
  text: "#edf8f2",
  muted: "#99b2a5",
  mint: "#6ce6b1",
};
export function Months({
  s,
  hidden,
  investment,
}: {
  s: State;
  hidden: boolean;
  investment?: string;
}) {
  const [selected, setSelected] = useState("");
  const now = today();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(
      Number(now.slice(0, 4)),
      Number(now.slice(5, 7)) - 1 - 5 + i,
      1,
    );
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const data = months.map((month) => {
    const r = summary(s, month);
    return {
      month,
      a: investment
        ? s.transactions
            .filter(
              (t) =>
                t.kind === "contribution" &&
                t.date.startsWith(month) &&
                (investment === "all" || t.destination === investment),
            )
            .reduce((n, t) => n + t.amount, 0)
        : r.income,
      b: investment ? 0 : r.expenses,
    };
  });
  const max = Math.max(1, ...data.flatMap((x) => [x.a, x.b]));
  return (
    <View style={v.panel}>
      <Text style={v.heading}>
        {investment ? "Contributions" : "Monthly cash flow"}
      </Text>
      <Text style={v.small}>
        {investment ? "Money you added" : "Mint: income · Coral: spending"} ·
        Last 6 months · Current month partial
      </Text>
      {hidden ? (
        <Text style={v.muted}>Chart hidden for privacy</Text>
      ) : (
        <>
          <Svg
            height={144}
            viewBox="0 0 300 144"
            accessibilityLabel={
              investment
                ? "Monthly contributions"
                : "Monthly income and spending"
            }
          >
            {data.map((d, i) => (
              <React.Fragment key={d.month}>
                <Rect
                  x={i * 50 + 10}
                  y={140 - (d.a / max) * 128}
                  width={investment ? 26 : 12}
                  height={(d.a / max) * 128}
                  rx={4}
                  fill="#6ce6b1"
                  onPress={() => setSelected(d.month)}
                />
                {!investment && (
                  <Rect
                    x={i * 50 + 25}
                    y={140 - (d.b / max) * 128}
                    width={12}
                    height={(d.b / max) * 128}
                    rx={4}
                    fill="#f2927d"
                    onPress={() => setSelected(d.month)}
                  />
                )}
              </React.Fragment>
            ))}
          </Svg>
          <View style={v.row}>
            {data.map((d) => (
              <Pressable
                key={d.month}
                onPress={() => setSelected(d.month)}
                style={{ paddingVertical: 10 }}
              >
                <Text style={v.small}>{d.month.slice(5)}</Text>
              </Pressable>
            ))}
          </View>
          {selected &&
            data
              .filter((d) => d.month === selected)
              .map((d) => (
                <Text key={d.month} style={v.muted}>
                  {d.month} · {money(d.a)}
                  {!investment ? ` / ${money(d.b)}` : ""}
                </Text>
              ))}
          {max === 1 && <Text style={v.muted}>No recorded activity yet</Text>}
        </>
      )}
    </View>
  );
}
export function CategoryBars({
  s,
  month,
  hidden,
}: {
  s: State;
  month: string;
  hidden: boolean;
}) {
  const rows = Object.entries(summary(s, month).categories).sort(
    (a, b) => b[1] - a[1],
  );
  const max = Math.max(1, ...rows.map((x) => x[1]));
  return (
    <View style={v.panel}>
      <Text style={v.heading}>Where it went</Text>
      <Text style={v.small}>{month || "All recorded months"}</Text>
      {hidden ? (
        <Text style={v.muted}>Spending hidden</Text>
      ) : rows.length ? (
        rows.map(([name, value]) => (
          <View key={name} style={{ gap: 8 }}>
            <View style={v.row}>
              <Text style={v.muted}>{name}</Text>
              <Text style={v.text}>{money(value)}</Text>
            </View>
            <View style={v.track}>
              <View
                style={{
                  height: 7,
                  borderRadius: 4,
                  width: `${(value / max) * 100}%`,
                  backgroundColor: palette.mint,
                }}
              />
            </View>
          </View>
        ))
      ) : (
        <Text style={v.muted}>Categories appear after your first expense.</Text>
      )}
    </View>
  );
}
export function WalletHome({
  s,
  hidden,
  toggle,
  edit,
  details,
  add,
}: {
  s: State;
  hidden: boolean;
  toggle: () => void;
  edit: (a: Account) => void;
  details: (a: Account) => void;
  add: () => void;
}) {
  const t = totals(s);
  const cash = s.accounts.filter((a) => !a.archived && a.kind !== "investment");
  const show = (n: number) => (hidden ? "••••" : money(n));
  return (
    <>
      <View style={v.hero}>
        <View style={v.row}>
          <Text style={v.kicker}>AVAILABLE MONEY</Text>
          <Pressable
            onPress={toggle}
            accessibilityLabel={hidden ? "Show amounts" : "Hide amounts"}
            style={{ padding: 10 }}
          >
            <Ionicons
              name={hidden ? "eye-off-outline" : "eye-outline"}
              size={24}
              color={palette.mint}
            />
          </Pressable>
        </View>
        <Text adjustsFontSizeToFit numberOfLines={1} style={v.total}>
          {show(t.available)}
        </Text>
        <Text style={v.muted}>{show(t.reserved)} reserved for goals</Text>
        <View style={[v.row, { marginTop: 20 }]}>
          {[
            ["Actual cash", t.cash],
            ["Investments", t.investments],
            ["Total assets", t.assets],
          ].map(([label, n]) => (
            <View key={label}>
              <Text style={v.small}>{label}</Text>
              <Text style={v.text}>{show(Number(n))}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={v.row}>
        <Text style={v.heading}>Your accounts</Text>
        <Pressable onPress={add} style={{ padding: 12 }}>
          <Ionicons name="add-circle-outline" size={26} color={palette.mint} />
        </Pressable>
      </View>
      <View style={v.grid}>
        {cash.map((a) => {
          const key = brandKey(a),
            b = brands[key] ?? { color: "#253e34", ink: "#e9fff4" },
            logo = logos[key];
          return (
            <Pressable
              key={a.id}
              onPress={() => details(a)}
              style={[v.tile, { backgroundColor: b.color }]}
              accessibilityLabel={a.name + " account details"}
            >
              <View style={v.row}>
                <View
                  style={{
                    height: 32,
                    width: 86,
                    justifyContent: "center",
                    borderRadius: 6,
                    padding: 4,
                    backgroundColor: key === "maya" ? "#121c16" : "#ffffff",
                  }}
                >
                  {logo?.svg ? (
                    <SvgCss xml={logo.svg} width={78} height={26} />
                  ) : logo?.uri ? (
                    <Image
                      source={{ uri: logo.uri }}
                      style={{ width: 78, height: 26 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons name="wallet-outline" size={25} color={b.ink} />
                  )}
                </View>
                <Pressable
                  accessibilityLabel={"Update " + a.name + " actual balance"}
                  onPress={(e) => {
                    e.stopPropagation();
                    edit(a);
                  }}
                  style={{ padding: 10 }}
                >
                  <Ionicons name="pencil" size={18} color={b.ink} />
                </Pressable>
              </View>
              <Text
                numberOfLines={1}
                style={{
                  color: b.ink,
                  fontWeight: "600",
                  fontSize: 13,
                  marginTop: 12,
                }}
              >
                {a.name}
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  fontSize: 24,
                  fontWeight: "800",
                  color: b.ink,
                  marginVertical: 7,
                }}
              >
                {show(available(s, a))}
              </Text>
              <Text style={{ color: b.ink, fontSize: 10 }}>Available</Text>
              <Text style={{ color: b.ink, fontSize: 10, marginTop: 12 }}>
                Actual {show(balance(s, a))}
              </Text>
              <Text style={{ color: b.ink, fontSize: 10 }}>
                Reserved {show(reserved(s, a.id))}
              </Text>
              {available(s, a) < 0 && (
                <Text style={{ color: b.ink, fontWeight: "bold" }}>
                  Review reservations
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
      <Months s={s} hidden={hidden} />
      {s.goals
        .filter((g) => !g.archived)
        .slice(0, 2)
        .map((g) => {
          const n = s.allocations
            .filter((a) => a.goal === g.id)
            .reduce((n, a) => n + a.amount, 0);
          return (
            <View style={v.panel} key={g.id}>
              <Text style={v.heading}>{g.name}</Text>
              <Text style={v.muted}>
                {show(n)} / {show(g.target)}
              </Text>
              {!hidden && (
                <View style={v.track}>
                  <View
                    style={{
                      height: 7,
                      width: `${Math.min(100, (n / g.target) * 100)}%`,
                      backgroundColor: palette.mint,
                    }}
                  />
                </View>
              )}
            </View>
          );
        })}
      <View style={v.panel}>
        <Text style={v.heading}>Recent activity</Text>
        {s.transactions
          .slice()
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 3)
          .map((t) => (
            <View key={t.id} style={v.row}>
              <Ionicons
                name={
                  t.kind === "expense"
                    ? "arrow-up-circle-outline"
                    : "swap-horizontal-outline"
                }
                color={palette.mint}
                size={25}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={v.text}>{t.category || t.kind}</Text>
                <Text style={v.small}>{t.date}</Text>
              </View>
              <Text style={v.text}>{show(t.amount)}</Text>
            </View>
          ))}
        {!s.transactions.length && (
          <Text style={v.muted}>Your first entry starts the story.</Text>
        )}
      </View>
    </>
  );
}
export const v = StyleSheet.create({
  panel: {
    padding: 18,
    backgroundColor: palette.panel,
    borderRadius: 22,
    gap: 12,
  },
  hero: { padding: 22, borderRadius: 26, backgroundColor: "#182d25" },
  heading: { fontSize: 19, fontWeight: "700", color: palette.text },
  kicker: {
    color: palette.mint,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
  },
  total: { fontSize: 42, fontWeight: "800", color: palette.text },
  muted: { color: palette.muted, fontSize: 13 },
  small: { color: palette.muted, fontSize: 10 },
  text: { color: palette.text, fontSize: 13, fontWeight: "600" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "48%", borderRadius: 22, padding: 15, minHeight: 190 },
  track: {
    height: 7,
    backgroundColor: "#2b3e34",
    borderRadius: 4,
    overflow: "hidden",
  },
});
