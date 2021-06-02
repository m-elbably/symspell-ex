import {Token, Tokenizer} from "../../types";
import {Alphabets} from "../../constants";

export class CoreTokenizer implements Tokenizer {
    private readonly _spaceExpression = /\s+/g;
    private readonly _expressions = [
        {value: /[(http(s)?)://(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi, tag: 'url'},
        {value: /\d+\/\d+|\d(?:[.,-\/]?\d)*(?:\.\d+)?/g, tag: 'number', alphabet: Alphabets.LATIN},
        {value: /[\u0660-\u0669]+/g, tag: 'number', alphabet: Alphabets.ARABIC},
        {value: /[A-zÀ-ú]+/gi, tag: 'word', alphabet: Alphabets.LATIN},
        {value: /[\u0620-\u06EF]+/g, tag: 'word', alphabet: Alphabets.ARABIC},
        {value: /[.!?;\-()\[\]{}"]/g, tag: 'punctuation', alphabet: Alphabets.LATIN},
        {value: /[،؟]/g, tag: 'punctuation', alphabet: Alphabets.ARABIC},
        {value: /\s+/g, tag: 'space'}
    ];

    private _tokenizeSegment(input: string): Array<Token> {
        let tokens: Array<Token>;
        for(let i=0; i < this._expressions.length; i+= 1){
            const expression = this._expressions[i];
            const matches = input.match(expression.value) || [];
            const parts = input.split(expression.value);

            let mIndex = 0;
            tokens = [];
            for(let j=0; j < parts.length; j += 1) {
                const part = parts[j];
                if(part != null) {
                    if(part.trim().length > 0) {
                        tokens.push(new Token(part));
                    }
                }

                if(mIndex < matches.length && matches[mIndex] != null) {
                    const mToken = matches[mIndex].trim();
                    if(mToken.length > 0) {
                        tokens.push(new Token(
                            mToken,
                            expression.tag,
                            expression.alphabet || null
                        ));
                    }

                    if(mToken.length >= input.length){
                        break;
                    }
                }

                mIndex++;
            }

            if(matches.length > 0) {
                break;
            }
        }

        if(tokens.length === 1 && tokens[0].tag == null) {
            tokens[0].tag = 'none';
        }

        return tokens;
    }

    private _tokenizeInput(input: Token, tokens: Array<Token>): void {
        const tokenValue = input.value.trim();
        if(tokenValue.length === 0) {
            return;
        }

        const bTokens = this._tokenizeSegment(tokenValue);
        for (let i = 0; i < bTokens.length; i += 1) {
            const pSpaceIndex = input.value.indexOf(`${bTokens[i].value.trim()} `);
            const tDistance = pSpaceIndex >= 0 ? 1 : 0;
            bTokens[i].distance = i >= bTokens.length - 1 ?
                                    input.distance : tDistance;
            if (bTokens[i].tag == null) {
                this._tokenizeInput(bTokens[i], tokens);
            } else {
                tokens.push(bTokens[i]);
            }
        }
    }

    tokenize(input: string): Array<Token> {
        if (input == null || input.length === 0) {
            return [];
        }

        const tokens: Array<Token> = [];
        this._tokenizeInput(new Token(input), tokens);
        return tokens;
    }
}
