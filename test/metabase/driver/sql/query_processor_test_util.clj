(ns metabase.driver.sql.query-processor-test-util
  (:require
   [clojure.string :as str]
   [clojure.test :refer :all]
   [metabase.driver :as driver]
   [metabase.driver.util :as driver.u]
   [metabase.query-processor :as qp]
   [metabase.util :as u]))

;;;; [[query->sql-map]] and [[sql->sql-map]] -- these parse an actual SQL map into a pseudo-HoneySQL form

(defn pretty-sql
  "Remove quotes around identifiers (where possible) and remove `public.` qualifiers."
  [s]
  (if-not (string? s)
    s
    (-> s
        (str/replace #"\"([\w\d_-]+)\"" "$1")
        (str/replace #"PUBLIC\." "")
        (str/replace #"public\." ""))))

(defn even-prettier-sql
  "Do [[pretty-sql]] transformations, and remove excess whitespace and *all* quote marks."
  [s]
  (-> s
      pretty-sql
      (str/replace #"`" "")
      (str/replace #"\s+" " ")
      (str/replace #"\(\s*" "(")
      (str/replace #"\s*\)" ")")
      (str/replace #"'" "\"")
      str/trim))

(defn- symbols [s]
  (binding [*read-eval* false]
    (read-string (str \( s \)))))

;; This is not meant to be a complete list. Just the ones we want to show up on their own lines with [[sql->sql-map]]
;; and [[query->sql-map]] below. It's only for test purposes anyway so we can add more stuff here if we need it.
(def ^:private sql-keywords-that-should-get-newlines
  '#{[LEFT JOIN]
     [RIGHT JOIN]
     [INNER JOIN]
     [OUTER JOIN]
     [FULL JOIN]
     [GROUP BY]
     [ORDER BY]
     SELECT
     FROM
     LIMIT
     WHERE
     OFFSET
     HAVING})

(defn- sql-map
  "Convert a sequence of SQL symbols into something sorta like a HoneySQL map. The main purpose of this is to make tests
  somewhat possible to debug. The goal isn't to actually be HoneySQL, but rather to make diffing huge maps easy."
  [symbols]
  (if-not (sequential? symbols)
    symbols
    (loop [m {}, current-key nil, [x & [y :as more]] symbols]
      (cond
        ;; two-word "keywords"
        (sql-keywords-that-should-get-newlines [x y])
        (let [x-y (keyword (str/lower-case (format "%s-%s" (name x) (name y))))]
          (recur m x-y (rest more)))

        ;; one-word keywords
        (sql-keywords-that-should-get-newlines x)
        (let [x (keyword (str/lower-case x))]
          (recur m x more))

        ;; if we stumble upon a nested sequence that starts with SQL keyword(s) then recursively transform that into a
        ;; map (e.g. for things like subselects)
        (and (sequential? x)
             (or (sql-keywords-that-should-get-newlines (take 2 x))
                 (sql-keywords-that-should-get-newlines (first x))))
        (recur m current-key (cons (sql-map x) more))

        :else
        (let [m (update m current-key #(conj (vec %) x))]
          (if more
            (recur m current-key more)
            m))))))

(defn sql->sql-map
  "Convert a `sql` string into a HoneySQL-esque map for easy diffing."
  [sql]
  (-> sql even-prettier-sql symbols sql-map))

(defn- query->raw-native-query
  "Compile an MBQL query to a raw native query."
  ([{database-id :database, :as query}]
   (query->raw-native-query (or driver/*driver*
                                (driver.u/database->driver database-id))
                            query))

  ([_driver query]
   (qp/compile query)))

(def ^{:arglists '([query] [driver query])} query->sql
  "Compile an MBQL query to 'pretty' SQL (i.e., remove quote marks and `public.` qualifiers)."
  (comp pretty-sql :query query->raw-native-query))

(def ^{:arglists '([query] [driver query])} query->sql-map
  "Compile MBQL query to SQL and parse it as a HoneySQL-esque map."
  (comp sql->sql-map query->sql))


;;;; [[testing]] context tooling

(defn- print-native-query-to-str
  "Attempt to compile `query` to a native query."
  [query]
  (u/ignore-exceptions
    (let [{native :query, :as query} (query->raw-native-query query)]
      (str "\nNative Query =\n"
           (if (string? native)
             native
             (u/pprint-to-str native))
           \newline
           \newline
           (u/pprint-to-str (dissoc query :query))
           \newline))))

(defn do-with-native-query-testing-context
  [query thunk]
  ;; building the pretty-printing string is actually a little bit on the expensive side so only do the work needed if
  ;; someone actually looks at the [[testing]] context (i.e. if the test fails)
  (testing (let [to-str (delay (print-native-query-to-str query))]
             (reify
               java.lang.Object
               (toString [_]
                 @to-str)))
    (thunk)))

(defmacro with-native-query-testing-context
  "Compile `query` to a native query (and pretty-print it if it is SQL) and add it as [[testing]] context around
  `body`."
  [query & body]
  `(do-with-native-query-testing-context ~query (fn [] ~@body)))
