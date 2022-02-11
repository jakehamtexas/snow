import _ from "lodash";
import { OneOf } from "./combinatoric";
import { CombinatoricStructureUnion } from "./combinatoric/combinatoric";
import { expanded, shortestCombinatoricStructurePath, Subject } from "./graph";
import { Lazy } from "./lazy";

export function* calculate(firstArg: Subject, ...otherArgs: Subject[]) {
	const subjects = [firstArg, ...otherArgs];

	const possibilitiesPerArgSubject = Lazy.array(subjects)
		.map((subject) => {
			const hasCombinatoricStructure = Boolean(shortestCombinatoricStructurePath(subject));
			if (!hasCombinatoricStructure) return Lazy.array([subject]);
			return expanded(subject);
		})
		.map((expanded) => OneOf(expanded))
		.collect()
		.entries();

	const toArray = () => [...possibilitiesPerArgSubject];
	yield* _.chain(possibilitiesPerArgSubject)
		.thru(toArray)
		.thru(_.fromPairs)
		.thru(expanded)
		.value()
		.collect()
		.map(_.toPairs)
		.map(
			(entries) =>
				_.chain(entries)
					.map(([indexStr, v]) => [parseInt(indexStr, 10), v])
					.sortBy(([pos]) => pos)
					.map(_.last)
					.value() as object[]
		);
}

type Irreducible = string | number | symbol | null | undefined | boolean;
type NormalizedFormSubjectNode<TSubject, K extends keyof TSubject> = TSubject[K] extends infer V
	? V extends Irreducible
		? V
		: V extends CombinatoricStructureUnion
		? NormalizedFormSubjectNode<V["array"], never>
		: V extends unknown[]
		? NormalizedFormSubjectNode<V, number>[]
		: V extends object
		? NormalizedFormSubject<V>
		: never
	: never;
type NormalizedFormSubject<TSubject extends object> = TSubject extends infer X
	? {
			[K in keyof X]: X extends infer U ? (K extends keyof U ? NormalizedFormSubjectNode<U, K> : never) : never;
	  }
	: never;

export type Snapshot<TSubject extends Subject, TOutput> = {
	input: NormalizedFormSubject<TSubject>[];
	output: TOutput;
}[];

export const makeSnapshot = <TSubject extends Subject, TOutput>(
	subjects: [TSubject, ...TSubject[]],
	fn: (...subjects: NormalizedFormSubject<TSubject>[]) => TOutput
): Snapshot<TSubject, TOutput> =>
	[...calculate(...subjects)].map((input) => ({
		input: input as unknown as NormalizedFormSubject<TSubject>[],
		output: fn(...(input as unknown as NormalizedFormSubject<TSubject>[])),
	}));
