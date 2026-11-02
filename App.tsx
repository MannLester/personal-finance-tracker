import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  TextProps,
  KeyboardAvoidingView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  getPrivacy,
  setPrivacy,
  initial,
  load,
  save,
  Snapshot,
} from "./src/storage";
import {
  Account,
  State,
  available,
  backup,
  balance,
  cents,
  dueDate,
  money as formatMoney,
  reserved,
  restore,
  summary,
  today,
  totals,
} from "./src/finance";

import { WalletHome, Months, CategoryBars, palette } from "./src/visuals";
import { Ionicons } from "@expo/vector-icons";
const PrivacyContext = React.createContext(false);
function Text(props: TextProps) {
  return (
    <NativeText {...props} style={[{ color: palette.text }, props.style]} />
  );
}
type Form = { type: string; id: string; values: Record<string, string> };
const navIcons = {
  Home: "wallet-outline",
  History: "receipt-outline",
  Investments: "trending-up-outline",
  Goals: "flag-outline",
  Settings: "settings-outline",
};
const tabs = ["Home", "History", "Investments", "Goals", "Settings"];
const message = (e: unknown) =>
  e && typeof e === "object" && "message" in e ? String(e.message) : String(e);
function Button({
  title,
  onPress,
  quiet = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  quiet?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        quiet && styles.quiet,
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[styles.buttonText, quiet && { color: "#6ce6b1" }]}>
        {title}
      </Text>
    </Pressable>
  );
}
function Field({
  label,
  value,
  onChange,
  numeric = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
}) {
  const hidden = React.useContext(PrivacyContext);
  const [picking, setPicking] = useState(false);
  const isDate = label.includes("YYYY-MM-DD");
  const parsed = new Date(value + "T12:00:00");
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={styles.input}
        secureTextEntry={numeric && hidden}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "decimal-pad" : "default"}
        autoCapitalize="none"
      />
      {isDate && (
        <Button quiet title="Choose date" onPress={() => setPicking(true)} />
      )}{" "}
      {picking && (
        <DateTimePicker
          value={Number.isNaN(parsed.getTime()) ? new Date() : parsed}
          mode="date"
          onChange={(_event, date) => {
            setPicking(false);
            if (date)
              onChange(
                `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
              );
          }}
        />
      )}
    </View>
  );
}
function Choices({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal>
        <View style={styles.choices}>
          {options.map((o) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: value === o.id }}
              key={o.id}
              onPress={() => onChange(o.id)}
              style={[styles.chip, value === o.id && styles.selected]}
            >
              <Text style={{ color: value === o.id ? "#10251b" : "#6ce6b1" }}>
                {o.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {!options.length && <Text>Create an account first.</Text>}
    </View>
  );
}
function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Tracker />
    </SafeAreaProvider>
  );
}
function Tracker() {
  const [investFilter, setInvestFilter] = useState("");
  const [hidden, setHidden] = useState(false),
    [expanded, setExpanded] = useState(false),
    [expandedId, setExpandedId] = useState("");
  const money = (n: number) => (hidden ? "????" : formatMoney(n));
  async function togglePrivacy() {
    try {
      await setPrivacy(!hidden);
      setHidden(!hidden);
    } catch (e) {
      Alert.alert("Could not save preference", message(e));
    }
  }
  const [snap, setSnap] = useState<Snapshot>(initial),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState("Home"),
    [form, setForm] = useState<Form | null>(null);
  const [query, setQuery] = useState(""),
    [month, setMonth] = useState(today().slice(0, 7)),
    [accountFilter, setAccountFilter] = useState(""),
    [kindFilter, setKindFilter] = useState("");
  const locked = useRef(false);
  const s = snap.data;
  async function refresh() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const privacy = await getPrivacy();
      setHidden(privacy);
      setSnap(await load());
      setReady(true);
      setNotice("");
    } catch (e) {
      setNotice("Could not open local records: " + message(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function commit(next: State, restoring = false) {
    if (locked.current) throw Error("Please wait for the current request.");
    locked.current = true;
    setBusy(true);
    try {
      const saved = await save(next, snap.revision, restoring);
      setSnap(saved);
      setReady(true);
      setNotice("Saved on this phone.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function act(next: State, restoring = false) {
    try {
      await commit(next, restoring);
    } catch (e) {
      Alert.alert(
        "Not saved",
        message(e) + "\nReopen local records before retrying if they changed.",
      );
    }
  }
  function open(
    type: string,
    values: Record<string, string> = {},
    id = Crypto.randomUUID(),
  ) {
    setExpanded(false);
    setForm({ type, id, values });
  }
  const name = (id: string | null) =>
    s.accounts.find((a) => a.id === id)?.name ?? "—";
  function transaction(values: Record<string, string> = {}, id?: string) {
    open(
      "transaction",
      {
        kind: "expense",
        date: today(),
        amount: "",
        fee: "0",
        category: s.categories[0] ?? "Other",
        note: "",
        source: "",
        destination: "",
        ...values,
      },
      id,
    );
  }
  function remove(type: keyof State, id: string) {
    Alert.alert(
      "Delete record?",
      "Balances will be recalculated. This cannot be undone without a backup.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const next = {
              ...s,
              [type]: (s[type] as { id: string }[]).filter((x) => x.id !== id),
            };
            void act(next);
          },
        },
      ],
    );
  }
  async function submit() {
    if (!form) return;
    try {
      const v = form.values,
        id = form.id;
      let next: State = { ...s };
      const put = (key: keyof State, row: any) => {
        next = {
          ...next,
          [key]: [...(next[key] as any[]).filter((x) => x.id !== id), row],
        };
      };
      if (form.type === "account")
        put("accounts", {
          id,
          name: v.name.trim(),
          platform: v.platform.trim(),
          kind: v.kind,
          opening: cents(v.opening || "0"),
          archived: v.archived === "true",
          checked: v.checked || null,
        });
      if (form.type === "transaction") {
        const kind = v.kind;
        put("transactions", {
          id,
          kind,
          source: ["expense", "transfer", "contribution"].includes(kind)
            ? v.source || null
            : null,
          destination: kind !== "expense" ? v.destination || null : null,
          amount: cents(v.amount),
          fee: ["transfer", "contribution"].includes(kind)
            ? cents(v.fee || "0")
            : 0,
          date: v.date,
          category: kind === "expense" ? v.category : "",
          note: v.note || "",
        });
      }
      if (form.type === "goal")
        put("goals", {
          id,
          name: v.name.trim(),
          target: cents(v.target),
          deadline: v.deadline || "",
          archived: false,
        });
      if (form.type === "allocation") {
        const amount = cents(v.amount);
        const a = s.accounts.find((a) => a.id === v.account);
        if (!a) throw Error("Select an account.");
        const previous =
          s.allocations.find((x) => x.id === id && x.account === v.account)
            ?.amount ?? 0;
        if (amount > available(s, a) + previous)
          throw Error("This account does not have enough available money.");
        put("allocations", { id, goal: v.goal, account: v.account, amount });
      }
      if (form.type === "valuation")
        put("valuations", {
          id,
          account: v.account,
          amount: cents(v.amount),
          date: v.date,
        });
      if (form.type === "reminder")
        put("reminders", {
          id,
          account: v.account,
          day: Number(v.day),
          suggested: cents(v.suggested || "0"),
          completed: s.reminders.find((r) => r.id === id)?.completed ?? [],
        });
      if (form.type === "category") {
        if (!v.name.trim()) throw Error("Enter a category name.");
        next = { ...s, categories: [...s.categories, v.name.trim()] };
      }
      if (form.type === "reconcile") {
        const a = s.accounts.find((a) => a.id === v.account);
        if (!a) throw Error("Choose an account.");
        if (a.kind === "investment")
          throw Error("Use Update value for investment accounts.");
        const difference = cents(v.amount) - balance(s, a);
        if (!v.note?.trim())
          throw Error("Explain the balance check or correction.");
        next = {
          ...s,
          accounts: s.accounts.map((x) =>
            x.id === a.id ? { ...x, checked: today() } : x,
          ),
        };
        if (difference)
          next.transactions = [
            ...s.transactions,
            {
              id,
              kind: "adjustment",
              source: null,
              destination: a.id,
              amount: difference,
              fee: 0,
              date: today(),
              category: "",
              note: v.note,
            },
          ];
      }
      await commit(next);
      setForm(null);
    } catch (e) {
      Alert.alert("Not saved", message(e));
    }
  }
  async function exportBackup() {
    try {
      if (!ready) throw Error("Load your records first.");
      const fresh = await load();
      setSnap(fresh);
      const file = new File(Paths.cache, "finance-backup.json");
      file.write(backup(fresh.data));
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: "Save finance backup",
      });
    } catch (e) {
      Alert.alert("Backup failed", message(e));
    }
  }
  async function importBackup() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      const data = restore(await new File(picked.assets[0].uri).text());
      Alert.alert(
        "Replace all financial records?",
        "This backup will replace your current records. Export a backup first if you need to preserve them.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Replace",
            style: "destructive",
            onPress: () => void act(data, true),
          },
        ],
      );
    } catch (e) {
      Alert.alert("Invalid backup", message(e));
    }
  }
  const field = (key: string, label: string, numeric = false) => (
    <Field
      key={key}
      label={label}
      value={form?.values[key] ?? ""}
      onChange={(value) =>
        setForm((f) =>
          f ? { ...f, values: { ...f.values, [key]: value } } : f,
        )
      }
      numeric={numeric}
    />
  );
  const choices = (
    key: string,
    label: string,
    options: { id: string; name: string }[],
  ) => (
    <Choices
      key={key}
      label={label}
      value={form?.values[key] ?? ""}
      options={options}
      onChange={(value) =>
        setForm((f) =>
          f ? { ...f, values: { ...f.values, [key]: value } } : f,
        )
      }
    />
  );
  const accounts = s.accounts.filter((a) => !a.archived),
    cash = accounts.filter((a) => a.kind !== "investment"),
    investments = accounts.filter((a) => a.kind === "investment");
  const total = totals(s),
    report = summary(s, month);
  return (
    <PrivacyContext.Provider value={hidden}>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.eyebrow} numberOfLines={1} adjustsFontSizeToFit>
              PERSONAL FINANCE TRACKER
            </Text>
            <Text style={styles.title}>
              {tab === "Home" ? "Your wallet" : tab}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Pressable
              accessibilityLabel={hidden ? "Show amounts" : "Hide amounts"}
              onPress={() => void togglePrivacy()}
              style={{ padding: 12 }}
            >
              <Ionicons
                name={hidden ? "eye-off-outline" : "eye-outline"}
                size={24}
                color={palette.mint}
              />
            </Pressable>
            <Button
              title="+ Add"
              disabled={!ready || busy}
              onPress={() => transaction()}
            />
          </View>
        </View>
        {busy && <ActivityIndicator color={palette.mint} />}{" "}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {!ready ? (
            <Card title="Opening local records">
              <Button title="Retry" onPress={() => void refresh()} />
              <Button
                title="Restore backup"
                onPress={() => void importBackup()}
              />
            </Card>
          ) : (
            <>
              {tab === "Home" && (
                <WalletHome
                  s={s}
                  hidden={hidden}
                  toggle={() => void togglePrivacy()}
                  add={() => open("account", { kind: "bank", opening: "0" })}
                  edit={(a) =>
                    open("reconcile", {
                      account: a.id,
                      amount: String(balance(s, a) / 100),
                      note: "Manual balance update",
                    })
                  }
                  details={(a) => open("detail", { account: a.id })}
                />
              )}{" "}
              {tab === "History" && (
                <>
                  <CategoryBars s={s} month={month} hidden={hidden} />
                  <Field
                    label="Search notes, category or account"
                    value={query}
                    onChange={setQuery}
                  />
                  {fieldOutsideMonth()}
                  <Choices
                    label="Account"
                    value={accountFilter}
                    options={[{ id: "", name: "All" }, ...s.accounts]}
                    onChange={setAccountFilter}
                  />
                  <Choices
                    label="Type"
                    value={kindFilter}
                    options={[
                      "",
                      "income",
                      "expense",
                      "transfer",
                      "contribution",
                      "earnings",
                      "adjustment",
                    ].map((id) => ({ id, name: id || "All" }))}
                    onChange={setKindFilter}
                  />
                  {s.transactions
                    .filter(
                      (t) =>
                        (!month || t.date.startsWith(month)) &&
                        (!kindFilter || t.kind === kindFilter) &&
                        (!accountFilter ||
                          t.source === accountFilter ||
                          t.destination === accountFilter) &&
                        `${t.note} ${t.category} ${name(t.source)} ${name(t.destination)}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                    )
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((t) => (
                      <View
                        key={t.id}
                        style={[styles.card, { gap: 7, padding: 14 }]}
                      >
                        <View style={styles.row}>
                          <Ionicons
                            name={
                              t.kind === "expense"
                                ? "arrow-up-circle-outline"
                                : "swap-horizontal-outline"
                            }
                            size={26}
                            color={palette.mint}
                          />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={{ fontWeight: "600" }}>
                              {t.category || t.kind}
                            </Text>
                            <Text style={styles.muted}>
                              {t.date} ? {name(t.source || t.destination)}
                            </Text>
                          </View>
                          <Text style={{ fontWeight: "700" }}>
                            {money(t.amount)}
                          </Text>
                          <Pressable
                            style={{ padding: 12 }}
                            accessibilityLabel="Transaction actions"
                            onPress={() =>
                              setExpandedId(expandedId === t.id ? "" : t.id)
                            }
                          >
                            <Ionicons
                              name="ellipsis-vertical"
                              color={palette.mint}
                              size={20}
                            />
                          </Pressable>
                        </View>
                        {expandedId === t.id && (
                          <>
                            <Text style={styles.muted}>
                              {t.note}
                              {t.fee ? " ? Fee " + money(t.fee) : ""}
                            </Text>
                            <View style={styles.row}>
                              <Button
                                quiet
                                title="Edit"
                                onPress={() =>
                                  transaction(
                                    {
                                      ...t,
                                      source: t.source ?? "",
                                      destination: t.destination ?? "",
                                      amount: String(t.amount / 100),
                                      fee: String(t.fee / 100),
                                    },
                                    t.id,
                                  )
                                }
                              />
                              <Button
                                quiet
                                title="Delete"
                                onPress={() => remove("transactions", t.id)}
                              />
                            </View>
                          </>
                        )}
                      </View>
                    ))}
                  <Text style={styles.muted}>
                    All records are saved on this phone.
                  </Text>
                </>
              )}
              {tab === "Investments" && (
                <>
                  <Months
                    s={s}
                    hidden={hidden}
                    investment={investFilter || "all"}
                  />
                  <Choices
                    label="Contribution chart"
                    value={investFilter}
                    options={[
                      { id: "", name: "All investments" },
                      ...investments,
                    ]}
                    onChange={setInvestFilter}
                  />
                  <Button
                    title="+ Investment account"
                    onPress={() =>
                      open("account", { kind: "investment", opening: "0" })
                    }
                  />
                  {investments.map((a) => (
                    <Card title={a.name} key={a.id}>
                      <Text style={styles.amount}>{money(balance(s, a))}</Text>
                      <Text style={styles.muted}>
                        Contributed:{" "}
                        {money(
                          s.transactions
                            .filter(
                              (t) =>
                                t.kind === "contribution" &&
                                t.destination === a.id,
                            )
                            .reduce((n, t) => n + t.amount, 0),
                        )}
                      </Text>
                      <Text style={styles.muted}>
                        Latest valuation:{" "}
                        {s.valuations
                          .filter((v) => v.account === a.id)
                          .map((v) => v.date)
                          .sort()
                          .at(-1) ?? "Not recorded"}{" "}
                        · Opening value {money(a.opening)}
                      </Text>
                      <Button
                        quiet
                        title="Add contribution"
                        onPress={() =>
                          transaction({
                            kind: "contribution",
                            destination: a.id,
                          })
                        }
                      />
                      <Button
                        quiet
                        title="Update value"
                        onPress={() =>
                          open("valuation", {
                            account: a.id,
                            amount: String(balance(s, a) / 100),
                            date: today(),
                          })
                        }
                      />
                      <Button
                        quiet
                        title="Edit account"
                        onPress={() =>
                          open(
                            "account",
                            {
                              ...a,
                              opening: String(a.opening / 100),
                              checked: a.checked ?? "",
                              archived: String(a.archived),
                            },
                            a.id,
                          )
                        }
                      />
                    </Card>
                  ))}
                  <Text style={styles.section}>Monthly reminders</Text>
                  <Button
                    quiet
                    title="+ Reminder"
                    onPress={() =>
                      open("reminder", { day: "1", suggested: "0" })
                    }
                  />
                  {s.reminders.map((r) => {
                    const period = today().slice(0, 7),
                      done = r.completed.includes(period),
                      due = dueDate(r, period);
                    return (
                      <Card key={r.id} title={name(r.account)}>
                        <Text>
                          {done
                            ? "Completed"
                            : today() > due
                              ? "Overdue"
                              : today() === due
                                ? "Due today"
                                : "Upcoming"}{" "}
                          · {due}
                        </Text>
                        <Text style={styles.muted}>
                          Suggested {money(r.suggested)} · Actual contribution
                          can vary.
                        </Text>
                        <Button
                          quiet
                          title="Record contribution"
                          onPress={() =>
                            transaction({
                              kind: "contribution",
                              destination: r.account,
                              amount: r.suggested
                                ? String(r.suggested / 100)
                                : "",
                            })
                          }
                        />
                        <Button
                          quiet
                          title={
                            done ? "Mark incomplete" : "Mark month complete"
                          }
                          onPress={() =>
                            void act({
                              ...s,
                              reminders: s.reminders.map((x) =>
                                x.id === r.id
                                  ? {
                                      ...x,
                                      completed: done
                                        ? x.completed.filter(
                                            (m) => m !== period,
                                          )
                                        : [...x.completed, period],
                                    }
                                  : x,
                              ),
                            })
                          }
                        />
                        <Button
                          quiet
                          title="Edit reminder"
                          onPress={() =>
                            open(
                              "reminder",
                              {
                                account: r.account,
                                day: String(r.day),
                                suggested: String(r.suggested / 100),
                              },
                              r.id,
                            )
                          }
                        />
                        <Button
                          quiet
                          title="Delete reminder"
                          onPress={() => remove("reminders", r.id)}
                        />
                      </Card>
                    );
                  })}
                  <Text style={styles.section}>Valuation history</Text>
                  <Text style={styles.muted}>
                    Values are end-of-day snapshots and include all movements on
                    that date. Recheck them after correcting older transactions.
                  </Text>
                  {s.valuations
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((v) => (
                      <Card title={`${name(v.account)} · ${v.date}`} key={v.id}>
                        <Text>{money(v.amount)}</Text>
                        <Button
                          quiet
                          title="Edit value"
                          onPress={() =>
                            open(
                              "valuation",
                              {
                                account: v.account,
                                date: v.date,
                                amount: String(v.amount / 100),
                              },
                              v.id,
                            )
                          }
                        />
                        <Button
                          quiet
                          title="Delete value"
                          onPress={() => remove("valuations", v.id)}
                        />
                      </Card>
                    ))}
                </>
              )}
              {tab === "Goals" && (
                <>
                  <Button title="+ Savings goal" onPress={() => open("goal")} />
                  <Text style={styles.muted}>
                    Optional reservations inside your accounts. Allocating money
                    does not move it between banks.
                  </Text>
                  {s.goals
                    .filter((g) => !g.archived)
                    .map((g) => {
                      const allocated = s.allocations
                        .filter((a) => a.goal === g.id)
                        .reduce((n, a) => n + a.amount, 0);
                      return (
                        <Card title={g.name} key={g.id}>
                          <Text style={styles.amount}>{money(allocated)}</Text>
                          <Text style={styles.muted}>
                            of {money(g.target)}{" "}
                            {g.deadline ? `· Target ${g.deadline}` : ""}
                          </Text>
                          <View
                            style={[styles.track, hidden && { opacity: 0 }]}
                          >
                            <View
                              style={[
                                styles.progress,
                                {
                                  width: `${Math.min(100, (allocated / g.target) * 100)}%`,
                                },
                              ]}
                            />
                          </View>
                          <Button
                            quiet
                            title="Allocate money"
                            onPress={() => open("allocation", { goal: g.id })}
                          />
                          {s.allocations
                            .filter((a) => a.goal === g.id)
                            .map((a) => (
                              <View key={a.id}>
                                <Text>
                                  {name(a.account)}: {money(a.amount)}
                                </Text>
                                <Button
                                  quiet
                                  title="Change reservation"
                                  onPress={() =>
                                    open(
                                      "allocation",
                                      {
                                        goal: g.id,
                                        account: a.account,
                                        amount: String(a.amount / 100),
                                      },
                                      a.id,
                                    )
                                  }
                                />
                                <Button
                                  quiet
                                  title="Release money"
                                  onPress={() => remove("allocations", a.id)}
                                />
                              </View>
                            ))}
                          <Button
                            quiet
                            title="Edit goal"
                            onPress={() =>
                              open(
                                "goal",
                                {
                                  name: g.name,
                                  target: String(g.target / 100),
                                  deadline: g.deadline,
                                },
                                g.id,
                              )
                            }
                          />
                          <Button
                            quiet
                            title="Finish / archive goal"
                            onPress={() =>
                              Alert.alert(
                                "Release reservations and archive?",
                                "This releases reserved money without recording spending. Record any actual purchase separately.",
                                [
                                  { text: "Cancel" },
                                  {
                                    text: "Archive",
                                    onPress: () =>
                                      void act({
                                        ...s,
                                        goals: s.goals.map((x) =>
                                          x.id === g.id
                                            ? { ...x, archived: true }
                                            : x,
                                        ),
                                        allocations: s.allocations.filter(
                                          (a) => a.goal !== g.id,
                                        ),
                                      }),
                                  },
                                ],
                              )
                            }
                          />
                        </Card>
                      );
                    })}
                </>
              )}
              {tab === "Settings" && (
                <>
                  <Card title="Your private tracker">
                    <Text style={styles.body}>
                      Offline storage ? PHP ? Philippine time. Reminders appear
                      inside the app. Export backups outside this app for
                      recovery.
                    </Text>

                    <Button
                      quiet
                      title="Export backup"
                      onPress={() => void exportBackup()}
                    />
                    <Button
                      quiet
                      title="Restore backup"
                      onPress={() => void importBackup()}
                    />
                  </Card>
                  <Card title="Expense categories">
                    {s.categories.map((c) => (
                      <Text key={c} style={styles.body}>
                        {c}
                      </Text>
                    ))}
                    <Button
                      quiet
                      title="+ Category"
                      onPress={() => open("category")}
                    />
                  </Card>
                  <Card title="All accounts">
                    {s.accounts.map((a) => (
                      <View key={a.id} style={styles.field}>
                        <Text>
                          {a.name}
                          {a.archived ? " · Archived" : ""}
                        </Text>
                        <Button
                          quiet
                          title={
                            a.archived ? "Restore account" : "Archive account"
                          }
                          onPress={() =>
                            void act({
                              ...s,
                              accounts: s.accounts.map((x) =>
                                x.id === a.id
                                  ? { ...x, archived: !x.archived }
                                  : x,
                              ),
                            })
                          }
                        />
                      </View>
                    ))}
                    <Text style={styles.muted}>
                      Archived account balances remain in totals and history.
                    </Text>
                  </Card>
                </>
              )}
            </>
          )}
        </ScrollView>
        <View style={styles.tabs}>
          {tabs.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              style={styles.tab}
            >
              <Ionicons
                name={
                  (
                    {
                      Home: "wallet-outline",
                      History: "receipt-outline",
                      Investments: "trending-up-outline",
                      Goals: "flag-outline",
                      Settings: "settings-outline",
                    } as const
                  )[t as keyof typeof navIcons] ?? "ellipse-outline"
                }
                size={22}
                color={tab === t ? palette.mint : palette.muted}
              />
              <Text
                style={[
                  styles.tabText,
                  tab === t && { color: "#6ce6b1", fontWeight: "800" },
                ]}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
        <Modal
          transparent
          visible={!!form}
          animationType="slide"
          onRequestClose={() => {
            if (!busy) setForm(null);
          }}
        >
          <KeyboardAvoidingView
            behavior="padding"
            style={{ flex: 1, backgroundColor: "#0009" }}
          >
            <SafeAreaView
              style={[
                styles.safe,
                {
                  marginTop: 60,
                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,
                },
              ]}
            >
              <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.title}>
                  {form?.type === "reconcile"
                    ? "Check balance"
                    : `Edit ${form?.type ?? ""}`}
                </Text>
                {form?.type === "account" && (
                  <>
                    {field("name", "Account name")}
                    {field("platform", "Platform (BPI, Maya, etc.)")}
                    {choices(
                      "kind",
                      "Account type",
                      ["bank", "wallet", "cash", "savings", "investment"].map(
                        (id) => ({ id, name: id }),
                      ),
                    )}
                    {field("opening", "Opening balance / value (PHP)", true)}
                    <Text style={styles.muted}>
                      Opening balance is your starting point before recorded
                      transactions.
                    </Text>
                  </>
                )}
                {form?.type === "transaction" && (
                  <>
                    {choices(
                      "kind",
                      "Type",
                      [
                        "expense",
                        "income",
                        "transfer",
                        "contribution",
                        "earnings",
                        "adjustment",
                      ].map((id) => ({ id, name: id })),
                    )}
                    {field(
                      "amount",
                      form.values.kind === "adjustment"
                        ? "Signed adjustment (PHP)"
                        : "Amount (PHP)",
                      true,
                    )}
                    {["expense", "transfer", "contribution"].includes(
                      form.values.kind,
                    ) &&
                      choices(
                        "source",
                        "From",
                        form.values.kind === "contribution" ? cash : accounts,
                      )}
                    {form.values.kind !== "expense" &&
                      choices(
                        "destination",
                        "To",
                        form.values.kind === "contribution"
                          ? investments
                          : accounts,
                      )}
                    {form.values.kind === "expense" &&
                      choices(
                        "category",
                        "Category",
                        s.categories.map((id) => ({ id, name: id })),
                      )}
                    <Button
                      quiet
                      title={expanded ? "Fewer details" : "Date, note and fee"}
                      onPress={() => setExpanded(!expanded)}
                    />
                    {(expanded || form.values.kind === "adjustment") && (
                      <>
                        {field("date", "Date (YYYY-MM-DD)")}
                        {field("note", "Note / adjustment reason")}
                        {["transfer", "contribution"].includes(
                          form.values.kind,
                        ) && field("fee", "Fee (PHP)", true)}
                      </>
                    )}
                  </>
                )}
                {form?.type === "detail" &&
                  s.accounts
                    .filter((a) => a.id === form.values.account)
                    .map((a) => (
                      <View key={a.id} style={{ gap: 14 }}>
                        <Text style={styles.title}>{a.name}</Text>
                        <Text style={styles.amount}>
                          {money(available(s, a))}
                        </Text>
                        <Text style={styles.muted}>
                          Available ? Actual {money(balance(s, a))} ? Reserved{" "}
                          {money(reserved(s, a.id))}
                        </Text>
                        <Button
                          title="Update actual balance"
                          onPress={() =>
                            open("reconcile", {
                              account: a.id,
                              amount: String(balance(s, a) / 100),
                              note: "Manual balance update",
                            })
                          }
                        />
                        <Button
                          quiet
                          title="Edit account"
                          onPress={() =>
                            open(
                              "account",
                              {
                                ...a,
                                opening: String(a.opening / 100),
                                archived: String(a.archived),
                                checked: a.checked ?? "",
                              },
                              a.id,
                            )
                          }
                        />
                        {s.transactions
                          .filter(
                            (t) => t.source === a.id || t.destination === a.id,
                          )
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .slice(0, 10)
                          .map((t) => (
                            <View key={t.id} style={styles.row}>
                              <Text>
                                {t.date} ? {t.category || t.kind}
                              </Text>
                              <Text>{money(t.amount)}</Text>
                            </View>
                          ))}
                      </View>
                    ))}
                {form?.type === "goal" && (
                  <>
                    {field("name", "Goal name")}
                    {field("target", "Target (PHP)", true)}
                    {field("deadline", "Optional deadline (YYYY-MM-DD)")}
                  </>
                )}
                {form?.type === "allocation" && (
                  <>
                    {choices("account", "Reserve from account", cash)}
                    {field("amount", "Reserved amount (PHP)", true)}
                  </>
                )}
                {form?.type === "valuation" && (
                  <>
                    {choices("account", "Investment", investments)}
                    {field("date", "Valuation date (YYYY-MM-DD)")}
                    {field("amount", "Total investment value (PHP)", true)}
                    <Text style={styles.muted}>
                      Include all activity through the end of this date. This is
                      a total value, not an additional earning.
                    </Text>
                  </>
                )}
                {form?.type === "reminder" && (
                  <>
                    {choices("account", "Investment", investments)}
                    {field("day", "Monthly day (1–31)", true)}
                    {field(
                      "suggested",
                      "Optional suggested contribution (PHP)",
                      true,
                    )}
                  </>
                )}
                {form?.type === "category" && field("name", "Category name")}
                {form?.type === "reconcile" && (
                  <>
                    {field(
                      "amount",
                      "Actual balance in banking app (PHP)",
                      true,
                    )}
                    {field("note", "Reason / balance-check note")}
                  </>
                )}
                {form?.type !== "detail" && (
                  <Button
                    title={busy ? "Saving…" : "Save"}
                    disabled={busy}
                    onPress={() => void submit()}
                  />
                )}
                <Button
                  quiet
                  title="Cancel"
                  disabled={busy}
                  onPress={() => setForm(null)}
                />
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </PrivacyContext.Provider>
  );
  function fieldOutsideMonth() {
    return (
      <Field
        label="Month (YYYY-MM; clear for all history)"
        value={month}
        onChange={setMonth}
      />
    );
  }
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0c1211" },
  content: { padding: 20, paddingBottom: 32, gap: 14 },
  header: {
    padding: 20,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 30, fontWeight: "800", color: "#edf8f2" },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#99b2a5",
    marginBottom: 7,
  },
  section: { fontSize: 20, fontWeight: "700", color: "#edf8f2" },
  card: {
    backgroundColor: "#17211e",
    padding: 18,
    borderRadius: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: "#293e33",
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#edf8f2" },
  amount: { fontSize: 26, fontWeight: "700", color: "#edf8f2" },
  body: { fontSize: 16, lineHeight: 26, color: "#d5e9de" },
  muted: { fontSize: 13, lineHeight: 21, color: "#99b2a5" },
  hero: { padding: 24, borderRadius: 22, backgroundColor: "#6ce6b1", gap: 10 },
  heroLabel: { color: "#d2e8df", fontSize: 13 },
  heroAmount: { fontSize: 38, color: "#10251b", fontWeight: "800" },
  button: {
    backgroundColor: "#6ce6b1",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 3,
  },
  quiet: { backgroundColor: "#22382d" },
  buttonText: { fontSize: 14, fontWeight: "700", color: "#10251b" },
  input: {
    backgroundColor: "#17211e",
    borderWidth: 1,
    borderColor: "#385044",
    padding: 13,
    borderRadius: 10,
    fontSize: 16,
    color: "#edf8f2",
  },
  field: { gap: 7, marginVertical: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#d5e9de" },
  choices: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  chip: { borderRadius: 20, padding: 12, backgroundColor: "#243c30" },
  selected: { backgroundColor: "#6ce6b1" },
  row: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#17211e",
    borderTopWidth: 1,
    borderColor: "#293e33",
  },
  tab: { flex: 1, paddingVertical: 19, alignItems: "center" },
  tabText: { fontSize: 11, color: "#99b2a5" },
  notice: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    color: "#99b2a5",
    fontSize: 12,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#243c30",
    overflow: "hidden",
  },
  progress: { height: 8, backgroundColor: "#3d9875" },
  warning: { color: "#a5481e", fontSize: 13 },
});
